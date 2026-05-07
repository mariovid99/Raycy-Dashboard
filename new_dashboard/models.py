from django.db import models
from django.core.validators import RegexValidator
from django.core.validators import EmailValidator, RegexValidator
from django.utils import timezone
import os
import uuid

class Nomenclatura(models.Model):
    clave = models.CharField(
        max_length=20,
        unique=True,
        verbose_name="Clave",
        help_text="Clave corta que identifica el tipo de gasto. Ej: ALM, MTTO, etc."
    )
    descripcion = models.TextField(
        verbose_name="Descripción",
        help_text="Descripción detallada de la nomenclatura."
    )

    class Meta:
        verbose_name = "Nomenclatura"
        verbose_name_plural = "Nomenclaturas"
        ordering = ['clave']

    def __str__(self):
        return f"{self.clave} - {self.descripcion[:50]}..."

class Proveedor(models.Model):
    nombre = models.CharField(
        max_length=200,
        verbose_name="Nombre del Proveedor",
        help_text="Nombre completo o razón social del proveedor"
    )
    
    telefono = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Teléfono",
        validators=[
            RegexValidator(
                regex=r'^\+?1?\d{9,15}$',
                message="El número de teléfono debe estar en formato: '+999999999'. Hasta 15 dígitos permitidos."
            )
        ],
        help_text="Número de teléfono con código de país"
    )
    
    email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="Correo Electrónico",
        help_text="Dirección de correo electrónico del proveedor"
    )
    
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Registro"
    )
    
    ultima_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Modificación"
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo",
        help_text="Indica si el proveedor está activo en el sistema"
    )
    
    # Campos para manejo de crédito y días de pago
    maneja_credito = models.BooleanField(
        default=False,
        verbose_name="Maneja Crédito",
        help_text="Indica si el proveedor ofrece crédito para las compras"
    )
    
    dias_credito = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name="Días de Crédito",
        help_text="Número de días para pagar al proveedor (solo aplica si maneja crédito)"
    )

    class Meta:
        verbose_name = "Proveedor"
        verbose_name_plural = "Proveedores"
        ordering = ['nombre']
        indexes = [
            models.Index(fields=['nombre']),
            models.Index(fields=['email'])
        ]

    def __str__(self):
        return self.nombre

    def clean(self):
        """
        Asegura que los datos sean consistentes antes de guardar
        """
        from django.core.exceptions import ValidationError
        
        self.nombre = self.nombre.strip()
        self.email = self.email.lower().strip()
        
        # Validar campos de crédito
        if self.maneja_credito and not self.dias_credito:
            raise ValidationError({
                'dias_credito': 'Los días de crédito son obligatorios cuando el proveedor maneja crédito.'
            })
        
        if not self.maneja_credito and self.dias_credito:
            # Si no maneja crédito, limpiar los días de crédito
            self.dias_credito = None

class TarjetaPago(models.Model):
    TIPO_METODO_CHOICES = [
        ('tarjeta', 'Tarjeta'),
        ('efectivo', 'Efectivo'),
        ('transferencia', 'Transferencia'),
        ('cheque', 'Cheque'),
    ]
    
    tipo_metodo = models.CharField(
        max_length=20,
        choices=TIPO_METODO_CHOICES,
        default='tarjeta',
        verbose_name="Tipo de Método",
        help_text="Tipo de método de pago"
    )
    
    alias = models.CharField(
        max_length=100,
        verbose_name="Alias/Nombre",
        help_text="Nombre identificador del método de pago (ej: Tarjeta Azul, Efectivo)"
    )
    
    terminacion = models.CharField(
        max_length=4,
        blank=True,
        null=True,
        validators=[
            RegexValidator(
                regex=r'^\d{4}$',
                message="La terminación debe ser exactamente 4 dígitos numéricos."
            )
        ],
        verbose_name="Terminación",
        help_text="Últimos 4 dígitos de la tarjeta (solo para tarjetas)"
    )
    
    banco = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Banco/Institución",
        help_text="Nombre del banco emisor o institución (solo para tarjetas/transferencias)"
    )
    
    fecha_registro = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Registro"
    )
    
    ultima_modificacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Modificación"
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name="Activo",
        help_text="Indica si el método de pago está activo en el sistema"
    )

    class Meta:
        verbose_name = "Método de Pago"
        verbose_name_plural = "Métodos de Pago"
        ordering = ['tipo_metodo', 'alias']
        indexes = [
            models.Index(fields=['alias']),
            models.Index(fields=['tipo_metodo']),
            models.Index(fields=['activo'])
        ]

    def __str__(self):
        if self.tipo_metodo == 'efectivo':
            return self.alias
        elif self.tipo_metodo == 'tarjeta' and self.terminacion:
            return f"{self.alias} - {self.banco} ****{self.terminacion}"
        else:
            return f"{self.alias} ({self.banco})" if self.banco else self.alias

    def clean(self):
        from django.core.exceptions import ValidationError
        
        # Validar que las tarjetas tengan terminación y banco
        if self.tipo_metodo == 'tarjeta':
            if not self.terminacion:
                raise ValidationError({
                    'terminacion': 'Las tarjetas deben tener terminación.'
                })
            if not self.banco:
                raise ValidationError({
                    'banco': 'Las tarjetas deben tener banco emisor.'
                })
        
        # Para efectivo, limpiar campos innecesarios
        if self.tipo_metodo == 'efectivo':
            self.terminacion = None
            self.banco = None


class Cliente(models.Model):
    """
    Modelo para gestionar la información de clientes corporativos.
    Optimizado para SQLite con campos específicos para la gestión empresarial.
    """
    
    # Validadores personalizados
    phone_validator = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="El número telefónico debe estar en formato válido. Ej: +52 1234567890"
    )
    
    # Campos principales
    nombre = models.CharField(
        max_length=255,
        verbose_name="Nombre del Cliente",
        help_text="Nombre completo o razón social del cliente",
        db_index=True  # Índice para búsquedas rápidas
    )
    
    email = models.EmailField(
        unique=False,
        verbose_name="Correo Electrónico",
        help_text="Dirección de correo electrónico principal",
        validators=[EmailValidator(message="Ingrese un email válido")],
        db_index=True
    )
    
    telefono = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Teléfono",
        help_text="Número telefónico principal de contacto",
        validators=[phone_validator]
    )
    
    # Campo JSON para múltiples ubicaciones (compatible con SQLite)
    ubicaciones = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Ubicaciones/Sucursales",
        help_text="Lista de ubicaciones o sucursales del cliente"
    )
    
    comentarios = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comentarios Especiales",
        help_text="Información adicional, notas importantes o características especiales del cliente"
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación",
        help_text="Fecha y hora en que se registró el cliente"
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización",
        help_text="Fecha y hora de la última modificación"
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name="Cliente Activo",
        help_text="Indica si el cliente está activo en el sistema"
    )   

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"
        ordering = ['-fecha_creacion', 'nombre']
        indexes = [
            models.Index(fields=['nombre', 'activo']),
            models.Index(fields=['fecha_creacion']),
            models.Index(fields=['email']),
        ]

    def __str__(self):
        return self.nombre
    
    @property
    def ubicaciones_str(self):
        """Devuelve ubicaciones como string separado por comas"""
        return ', '.join(self.ubicaciones) if self.ubicaciones else 'Sin ubicaciones'
    
    @property
    def tiene_ubicaciones_multiples(self):
        """Verifica si tiene múltiples ubicaciones"""
        return len(self.ubicaciones) > 1 if self.ubicaciones else False
    
    def agregar_ubicacion(self, nueva_ubicacion):
        """Método para agregar una nueva ubicación"""
        if nueva_ubicacion and nueva_ubicacion not in self.ubicaciones:
            self.ubicaciones.append(nueva_ubicacion)
            self.save()
    
    def remover_ubicacion(self, ubicacion):
        """Método para remover una ubicación"""
        if ubicacion in self.ubicaciones:
            self.ubicaciones.remove(ubicacion)
            self.save()


class Supervisor(models.Model):
    """
    Modelo para gestionar la información de supervisores del sistema.
    Optimizado para SQLite con campos específicos para la gestión de personal de supervisión.
    """
    
    # Validador personalizado para teléfono (reutilizando el del modelo Cliente)
    phone_validator = RegexValidator(
        regex=r'^\+?1?\d{9,15}$',
        message="El número telefónico debe estar en formato válido. Ej: +52 1234567890"
    )
    
    # Opciones para el estado del supervisor
    STATUS_CHOICES = [
        ('active', 'Activo'),
        ('inactive', 'Inactivo'),
    ]
    
    # Campos principales
    nombre = models.CharField(
        max_length=255,
        verbose_name="Nombre Completo",
        help_text="Nombre completo del supervisor",
        db_index=True  # Índice para búsquedas rápidas
    )
    
    email = models.EmailField(
        unique=True,
        verbose_name="Correo Electrónico",
        help_text="Dirección de correo electrónico del supervisor",
        validators=[EmailValidator(message="Ingrese un email válido")],
        db_index=True
    )
    
    telefono = models.CharField(
        max_length=20,
        verbose_name="Teléfono",
        help_text="Número telefónico de contacto del supervisor",
        validators=[phone_validator]
    )
    
    estado = models.CharField(
        max_length=10,
        choices=STATUS_CHOICES,
        default='active',
        verbose_name="Estado",
        help_text="Estado actual del supervisor en el sistema",
        db_index=True
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación",
        help_text="Fecha y hora en que se registró el supervisor"
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización",
        help_text="Fecha y hora de la última modificación"
    )
    
    # Campo adicional para comentarios o notas
    comentarios = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comentarios",
        help_text="Información adicional o notas sobre el supervisor"
    )
    
    # Campo para soft delete (eliminación lógica)
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado",
        help_text="Indica si el supervisor ha sido eliminado lógicamente del sistema",
        db_index=True
    )
    
    fecha_eliminacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Eliminación",
        help_text="Fecha y hora en que se eliminó lógicamente el supervisor"
    )

    class Meta:
        verbose_name = "Supervisor"
        verbose_name_plural = "Supervisores"
        ordering = ['-fecha_creacion', 'nombre']
        indexes = [
            models.Index(fields=['nombre', 'estado']),
            models.Index(fields=['fecha_creacion']),
            models.Index(fields=['email']),
            models.Index(fields=['estado']),
            models.Index(fields=['eliminado', 'estado']),
            models.Index(fields=['eliminado']),
        ]

    def __str__(self):
        return f"{self.nombre} ({self.get_estado_display()})"
    
    @property
    def is_active(self):
        """Verifica si el supervisor está activo"""
        return self.estado == 'active' and not self.eliminado
    
    @property
    def is_deleted(self):
        """Verifica si el supervisor está eliminado lógicamente"""
        return self.eliminado
    
    @property
    def estado_display(self):
        """Devuelve el estado en español para mostrar"""
        return self.get_estado_display()
    
    def activar(self):
        """Método para activar el supervisor"""
        self.estado = 'active'
        self.save()
    
    def desactivar(self):
        """Método para desactivar el supervisor"""
        self.estado = 'inactive'
        self.save()
    
    def eliminar_logicamente(self):
        """Método para eliminar lógicamente el supervisor"""
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.estado = 'inactive'  # También lo desactivamos
        self.save()
    
    def restaurar(self):
        """Método para restaurar un supervisor eliminado lógicamente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()
    
    @classmethod
    def activos(cls):
        """Manager personalizado para obtener solo supervisores activos y no eliminados"""
        return cls.objects.filter(eliminado=False)
    
    @classmethod
    def eliminados(cls):
        """Manager personalizado para obtener solo supervisores eliminados"""
        return cls.objects.filter(eliminado=True)


class ManoDeObra(models.Model):
    """
    Modelo para gestionar los costos de mano de obra por puesto.
    Optimizado para SQLite con campos específicos para la gestión de costos laborales.
    """
    
    # Campos principales
    puesto = models.CharField(
        max_length=255,
        verbose_name="Nombre del Puesto",
        help_text="Nombre descriptivo del puesto de trabajo",
        db_index=True  # Índice para búsquedas rápidas
    )
    
    costo_por_hora = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Costo por Hora",
        help_text="Costo por hora en moneda local para este puesto"
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción del Puesto",
        help_text="Descripción detallada de las responsabilidades y funciones del puesto"
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación",
        help_text="Fecha y hora en que se registró el puesto"
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización",
        help_text="Fecha y hora de la última modificación"
    )
    
    activo = models.BooleanField(
        default=True,
        verbose_name="Puesto Activo",
        help_text="Indica si el puesto está activo en el sistema"
    )
    
    # Campo para soft delete (eliminación lógica)
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado",
        help_text="Indica si el puesto ha sido eliminado lógicamente del sistema",
        db_index=True
    )
    
    fecha_eliminacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Eliminación",
        help_text="Fecha y hora en que se eliminó lógicamente el puesto"
    )

    class Meta:
        verbose_name = "Mano de Obra"
        verbose_name_plural = "Mano de Obra"
        ordering = ['-fecha_creacion', 'puesto']
        indexes = [
            models.Index(fields=['puesto', 'activo']),
            models.Index(fields=['fecha_creacion']),
            models.Index(fields=['costo_por_hora']),
            models.Index(fields=['eliminado', 'activo']),
            models.Index(fields=['eliminado']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(costo_por_hora__gt=0),
                name='costo_por_hora_positivo'
            ),
        ]

    def __str__(self):
        return f"{self.puesto} - ${self.costo_por_hora}/hr"
    
    @property
    def is_active(self):
        """Verifica si el puesto está activo"""
        return self.activo and not self.eliminado
    
    @property
    def is_deleted(self):
        """Verifica si el puesto está eliminado lógicamente"""
        return self.eliminado
    
    @property
    def costo_formateado(self):
        """Devuelve el costo formateado con símbolo de moneda"""
        return f"${self.costo_por_hora:,.2f}"
    
    @property
    def costo_diario(self):
        """Calcula el costo diario basado en 8 horas laborales"""
        return (self.costo_por_hora or 0) * 8
    
    @property
    def costo_mensual(self):
        """Calcula el costo mensual basado en 22 días laborales"""
        return self.costo_diario * 22
    
    def activar(self):
        """Método para activar el puesto"""
        self.activo = True
        self.save()
    
    def desactivar(self):
        """Método para desactivar el puesto"""
        self.activo = False
        self.save()
    
    def eliminar_logicamente(self):
        """Método para eliminar lógicamente el puesto"""
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.activo = False  # También lo desactivamos
        self.save()
    
    def restaurar(self):
        """Método para restaurar un puesto eliminado lógicamente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()
    
    def actualizar_costo(self, nuevo_costo):
        """Método para actualizar el costo por hora con validación"""
        if nuevo_costo <= 0:
            raise ValueError("El costo por hora debe ser mayor a cero")
        self.costo_por_hora = nuevo_costo
        self.save()
    
    @classmethod
    def activos(cls):
        """Manager personalizado para obtener solo puestos activos y no eliminados"""
        return cls.objects.filter(eliminado=False, activo=True)
    
    @classmethod
    def eliminados(cls):
        """Manager personalizado para obtener solo puestos eliminados"""
        return cls.objects.filter(eliminado=True)
    
    @classmethod
    def por_rango_costo(cls, costo_min=None, costo_max=None):
        """Filtra puestos por rango de costo por hora"""
        queryset = cls.activos()
        if costo_min is not None:
            queryset = queryset.filter(costo_por_hora__gte=costo_min)
        if costo_max is not None:
            queryset = queryset.filter(costo_por_hora__lte=costo_max)
        return queryset


def cotizacion_archivo_upload_path(instance, filename):
    """
    Función para generar la ruta de subida de archivos de cotizaciones.
    Organiza los archivos por cotización y fecha.
    """
    # Generar un nombre único para evitar conflictos
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Organizar por año/mes/cotización (limitando a 20 caracteres para evitar problemas en blob storage)
    fecha = timezone.now()
    numero_cotizacion_corto = instance.cotizacion.numero_cotizacion[:20]
    return f"cotizaciones/{fecha.year}/{fecha.month:02d}/{numero_cotizacion_corto}/{filename}"


class CotizacionManager(models.Manager):
    """Manager personalizado para el modelo Cotizacion"""
    
    def get_queryset(self):
        """Retorna el queryset base"""
        return super().get_queryset()
    
    def activos(self):
        """Retorna solo las cotizaciones no eliminadas"""
        return self.get_queryset().filter(eliminado=False)
    
    def eliminados(self):
        """Retorna solo las cotizaciones eliminadas"""
        return self.get_queryset().filter(eliminado=True)


class Cotizacion(models.Model):
    """
    Modelo para gestionar las cotizaciones de proyectos.
    Optimizado para SQLite con campos específicos para la gestión de cotizaciones.
    """
    
    # Campos principales
    numero_cotizacion = models.CharField(
        max_length=1000,
        unique=True,
        verbose_name="Número de Cotización",
        help_text="Número único identificador de la cotización (ej: COT-001)",
        db_index=True
    )
    
    numero_cotizacion_provisional = models.CharField(
        max_length=1000,
        blank=True,
        null=True,
        verbose_name="Número de Cotización Provisional",
        help_text="Número temporal para cotizaciones provisionales (ej: PROV-001)",
        db_index=True
    )
    
    fecha_cotizacion = models.DateField(
        verbose_name="Fecha de Cotización",
        help_text="Fecha en que se creó la cotización",
        db_index=True
    )
    
    # Relación con cliente (opcional, puede cotizarse sin cliente específico)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,  # Proteger eliminación si hay cotizaciones asociadas
        verbose_name="Cliente",
        help_text="Cliente asociado a esta cotización",
        related_name="cotizaciones",
        blank=True,
        null=True
    )
    
    # Estados de la cotización
    STATUS_CHOICES = [
        ('borrador', 'Borrador'),
        ('enviada', 'Enviada'),
        ('aceptada', 'Aceptada'),
        ('rechazada', 'Rechazada'),
        ('vencida', 'Vencida'),
    ]
    
    estado = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='borrador',
        verbose_name="Estado",
        help_text="Estado actual de la cotización",
        db_index=True
    )
    
    # Campos calculados (se actualizan automáticamente)
    total_materiales = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Total Materiales",
        help_text="Total del costo de materiales"
    )
    
    total_mano_obra = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Total Mano de Obra",
        help_text="Total del costo de mano de obra"
    )
    
    costo_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Costo Total",
        help_text="Costo total de la cotización (materiales + mano de obra)"
    )
    
    precio_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Precio Total",
        help_text="Precio total de venta de la cotización"
    )
    
    margen_estimado = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Margen Estimado",
        help_text="Margen de ganancia estimado (precio - costo)"
    )
    
    # Campo múltiplo
    multiplo = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        verbose_name="Múltiplo",
        help_text="Factor multiplicador opcional (debe ser mayor a 1.0, ej: 1.1, 1.5, 3.5)"
    )
    
    # Campo de moneda
    MONEDA_CHOICES = [
        ('MXN', 'Peso Mexicano'),
        ('USD', 'Dólar Estadounidense'),
    ]
    
    currency = models.CharField(
        max_length=3,
        choices=MONEDA_CHOICES,
        default='MXN',
        verbose_name="Moneda",
        help_text="Tipo de moneda de la cotización"
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación",
        help_text="Fecha y hora en que se registró la cotización"
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización",
        help_text="Fecha y hora de la última modificación"
    )
    
    fecha_envio = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Envío",
        help_text="Fecha en que se envió la cotización al cliente"
    )
    
    fecha_vencimiento = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Vencimiento",
        help_text="Fecha límite de validez de la cotización"
    )
    
    # Campo para soft delete (eliminación lógica)
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado",
        help_text="Indica si la cotización ha sido eliminada lógicamente del sistema",
        db_index=True
    )
    
    fecha_eliminacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Eliminación",
        help_text="Fecha y hora en que se eliminó lógicamente la cotización"
    )
    
    # Campos adicionales
    comentarios = models.TextField(
        blank=True,
        null=True,
        verbose_name="Comentarios",
        help_text="Notas adicionales sobre la cotización"
    )
    
    asignado = models.BooleanField(
        default=False,
        verbose_name="Asignado",
        help_text="Indica si la cotización ha sido asignada a una oportunidad",
        db_index=True
    )
    
    # Nuevo campo para cotizaciones provisionales
    es_provisional = models.BooleanField(
        default=False,
        verbose_name="Es Provisional",
        help_text="Indica si es una cotización provisional (vacía) para ser completada más tarde",
        db_index=True
    )
    
    # Relación many-to-many con supervisores
    supervisores = models.ManyToManyField(
        'Supervisor',
        blank=True,
        verbose_name="Supervisores",
        help_text="Supervisores asignados a esta cotización",
        related_name="cotizaciones"
    )

    # Manager personalizado
    objects = CotizacionManager()

    class Meta:
        verbose_name = "Cotización"
        verbose_name_plural = "Cotizaciones"
        ordering = ['-fecha_creacion', 'numero_cotizacion']
        indexes = [
            models.Index(fields=['numero_cotizacion']),
            models.Index(fields=['fecha_cotizacion', 'eliminado']),
            models.Index(fields=['cliente', 'eliminado']),
            models.Index(fields=['estado', 'eliminado']),
            models.Index(fields=['asignado']),
            models.Index(fields=['eliminado']),
        ]

    def __str__(self):
        cliente_str = self.cliente.nombre if self.cliente else "Sin cliente"
        precio_str = f"${self.precio_total:,.2f}" if self.precio_total else "$0.00"
        return f"{self.numero_cotizacion} - {cliente_str} ({precio_str})"
    
    @property
    def is_active(self):
        """Verifica si la cotización está activa"""
        return not self.eliminado
    
    @property
    def is_deleted(self):
        """Verifica si la cotización está eliminada lógicamente"""
        return self.eliminado
    
    @property
    def porcentaje_margen(self):
        """Calcula el porcentaje de margen"""
        if self.costo_total and self.costo_total > 0 and self.margen_estimado:
            return (self.margen_estimado / self.costo_total) * 100
        return 0
    
    @property
    def esta_vencida(self):
        """Verifica si la cotización está vencida"""
        if self.fecha_vencimiento:
            return timezone.now().date() > self.fecha_vencimiento
        return False
    
    @property
    def dias_vencimiento(self):
        """Calcula los días hasta el vencimiento"""
        if self.fecha_vencimiento:
            delta = self.fecha_vencimiento - timezone.now().date()
            return delta.days
        return None
    
    def clean(self):
        """Validaciones del modelo"""
        super().clean()
        if self.multiplo is not None and self.multiplo <= 1:
            from django.core.exceptions import ValidationError
            raise ValidationError({'multiplo': 'El múltiplo debe ser mayor a 1.0'})
    
    def calcular_totales(self):
        """Recalcula todos los totales basándose en los elementos"""
        materiales = self.elementos.filter(tipo='material', eliminado=False)
        mano_obra = self.elementos.filter(tipo='mano_obra', eliminado=False)
        margenes = self.elementos.filter(tipo__in=['gestion_materiales', 'utilidad', 'interes'], eliminado=False)
        
        self.total_materiales = sum(item.subtotal_costo or 0 for item in materiales)
        self.total_mano_obra = sum(item.subtotal_costo or 0 for item in mano_obra)
        total_margenes_costo = sum(item.subtotal_costo or 0 for item in margenes)
        self.costo_total = self.total_materiales + self.total_mano_obra + total_margenes_costo
        
        total_precio_materiales = sum(item.subtotal_precio or 0 for item in materiales)
        total_precio_mano_obra = sum(item.subtotal_precio or 0 for item in mano_obra)
        total_precio_margenes = sum(item.subtotal_precio or 0 for item in margenes)
        self.precio_total = total_precio_materiales + total_precio_mano_obra + total_precio_margenes
        
        self.margen_estimado = self.precio_total - self.costo_total
        self.save()
    
    def marcar_enviada(self):
        """Marca la cotización como enviada"""
        self.estado = 'enviada'
        self.fecha_envio = timezone.now()
        self.save()
    
    def marcar_aceptada(self):
        """Marca la cotización como aceptada"""
        self.estado = 'aceptada'
        self.save()
    
    def marcar_rechazada(self):
        """Marca la cotización como rechazada"""
        self.estado = 'rechazada'
        self.save()
    
    def eliminar_logicamente(self):
        """Método para eliminar lógicamente la cotización"""
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.save()
    
    def restaurar(self):
        """Método para restaurar una cotización eliminada lógicamente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()
    
    @classmethod
    def activas(cls):
        """Manager personalizado para obtener solo cotizaciones activas"""
        return cls.objects.filter(eliminado=False)
    
    @classmethod
    def eliminadas(cls):
        """Manager personalizado para obtener solo cotizaciones eliminadas"""
        return cls.objects.filter(eliminado=True)
    
    @classmethod
    def por_estado(cls, estado):
        """Filtra cotizaciones por estado"""
        return cls.activas().filter(estado=estado)
    
    @classmethod
    def por_cliente(cls, cliente_id):
        """Filtra cotizaciones por cliente"""
        return cls.activas().filter(cliente_id=cliente_id)
    
    @classmethod
    def generar_numero_cotizacion(cls):
        """Genera un nuevo número de cotización automáticamente"""
        ultimo = cls.objects.filter(
            numero_cotizacion__startswith='COT-'
        ).order_by('-numero_cotizacion').first()
        
        if ultimo:
            try:
                numero = int(ultimo.numero_cotizacion.split('-')[1]) + 1
            except (IndexError, ValueError):
                numero = 1
        else:
            numero = 1
        
        return f"COT-{numero:03d}"


class ElementoCotizacionManager(models.Manager):
    """Manager personalizado para el modelo ElementoCotizacion"""
    
    def get_queryset(self):
        """Retorna el queryset base"""
        return super().get_queryset()
    
    def activos(self):
        """Retorna solo los elementos no eliminados"""
        return self.get_queryset().filter(eliminado=False)
    
    def eliminados(self):
        """Retorna solo los elementos eliminados"""
        return self.get_queryset().filter(eliminado=True)


class ElementoCotizacion(models.Model):
    """
    Modelo para gestionar los elementos individuales de una cotización.
    Puede ser material o mano de obra.
    """
    
    TIPO_CHOICES = [
        ('material', 'Material'),
        ('mano_obra', 'Mano de Obra'),
        ('gestion_materiales', 'Gestión de Materiales'),
        ('utilidad', 'Utilidad'),
        ('interes', 'Interés'),
    ]
    
    # Relación con cotización
    cotizacion = models.ForeignKey(
        Cotizacion,
        on_delete=models.CASCADE,  # Si se elimina la cotización, se eliminan sus elementos
        verbose_name="Cotización",
        help_text="Cotización a la que pertenece este elemento",
        related_name="elementos"
    )
    
    # Tipo de elemento
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        verbose_name="Tipo de Elemento",
        help_text="Tipo de elemento: material o mano de obra",
        db_index=True
    )
    
    # Información del elemento
    concepto = models.CharField(
        max_length=255,
        verbose_name="Concepto/Puesto",
        help_text="Nombre del material o puesto de trabajo"
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción",
        help_text="Descripción detallada del elemento"
    )
    
    nota = models.TextField(
        blank=True,
        null=True,
        verbose_name="Nota",
        help_text="Notas adicionales sobre el elemento"
    )
    
    # Cantidades y costos
    unidades = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
        verbose_name="Unidades",
        help_text="Cantidad de unidades del elemento"
    )
    
    costo_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Costo Unitario",
        help_text="Costo por unidad del elemento"
    )
    
    precio_unitario = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Precio Unitario",
        help_text="Precio de venta por unidad del elemento"
    )
    
    # Relaciones opcionales con modelos existentes
    mano_obra = models.ForeignKey(
        ManoDeObra,
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        verbose_name="Mano de Obra",
        help_text="Referencia al puesto de mano de obra (si aplica)",
        related_name="elementos_cotizacion"
    )
    
    # Campos específicos para cálculo de interés
    dias_interes = models.PositiveIntegerField(
        blank=True,
        null=True,
        verbose_name="Días de Interés",
        help_text="Número de días para el cálculo de interés (solo para tipo 'interes')"
    )
    
    tasa_anual = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        blank=True,
        null=True,
        verbose_name="Tasa Anual (%)",
        help_text="Tasa de interés anual en porcentaje (solo para tipo 'interes')"
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )
    
    # Campo para soft delete (eliminación lógica)
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado",
        help_text="Indica si el elemento ha sido eliminado lógicamente",
        db_index=True
    )
    
    fecha_eliminacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Eliminación"
    )

    # Manager personalizado
    objects = ElementoCotizacionManager()

    class Meta:
        verbose_name = "Elemento de Cotización"
        verbose_name_plural = "Elementos de Cotización"
        ordering = ['cotizacion', 'tipo', 'concepto']
        indexes = [
            models.Index(fields=['cotizacion', 'tipo']),
            models.Index(fields=['tipo', 'eliminado']),
            models.Index(fields=['eliminado']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(unidades__gt=0),
                name='unidades_positivas'
            ),
            models.CheckConstraint(
                check=models.Q(costo_unitario__gte=0),
                name='costo_unitario_no_negativo'
            ),
            models.CheckConstraint(
                check=models.Q(precio_unitario__gte=0),
                name='precio_unitario_no_negativo'
            ),
        ]

    def __str__(self):
        return f"{self.concepto} - {self.get_tipo_display()} ({self.cotizacion.numero_cotizacion})"
    
    @property
    def subtotal_costo(self):
        """Calcula el subtotal del costo (unidades * costo_unitario)"""
        return (self.unidades or 0) * (self.costo_unitario or 0)
    
    @property
    def subtotal_precio(self):
        """Calcula el subtotal del precio (unidades * precio_unitario)"""
        return (self.unidades or 0) * (self.precio_unitario or 0)
    
    @property
    def margen_unitario(self):
        """Calcula el margen unitario (precio - costo)"""
        return (self.precio_unitario or 0) - (self.costo_unitario or 0)
    
    @property
    def margen_total(self):
        """Calcula el margen total del elemento"""
        return self.subtotal_precio - self.subtotal_costo
    
    @property
    def porcentaje_margen(self):
        """Calcula el porcentaje de margen"""
        costo = self.costo_unitario or 0
        if costo > 0:
            return (self.margen_unitario / costo) * 100
        return 0
    
    def eliminar_logicamente(self):
        """Método para eliminar lógicamente el elemento"""
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.save()
        # Recalcular totales de la cotización
        self.cotizacion.calcular_totales()
    
    def restaurar(self):
        """Método para restaurar un elemento eliminado lógicamente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()
        # Recalcular totales de la cotización
        self.cotizacion.calcular_totales()
    
    def save(self, *args, **kwargs):
        """Sobrescribe save para actualizar totales de cotización"""
        super().save(*args, **kwargs)
        # Recalcular totales de la cotización padre
        if not self.eliminado:
            self.cotizacion.calcular_totales()


class ArchivoCotizacion(models.Model):
    """
    Modelo para gestionar los archivos adjuntos de las cotizaciones.
    Almacena archivos relacionados con cada cotización.
    """
    
    TIPO_ARCHIVO_CHOICES = [
        ('pdf', 'PDF'),
        ('imagen', 'Imagen'),
        ('xml', 'XML'),
        ('documento', 'Documento'),
        ('otro', 'Otro'),
    ]
    
    # Relación con cotización
    cotizacion = models.ForeignKey(
        Cotizacion,
        on_delete=models.CASCADE,  # Si se elimina la cotización, se eliminan sus archivos
        verbose_name="Cotización",
        help_text="Cotización a la que pertenece este archivo",
        related_name="archivos"
    )
    
    # Información del archivo
    archivo = models.FileField(
        upload_to=cotizacion_archivo_upload_path,
        verbose_name="Archivo",
        help_text="Archivo adjunto a la cotización"
    )
    
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre Original",
        help_text="Nombre original del archivo subido"
    )
    
    tipo_archivo = models.CharField(
        max_length=20,
        choices=TIPO_ARCHIVO_CHOICES,
        default='otro',
        verbose_name="Tipo de Archivo",
        help_text="Categoría del archivo subido"
    )
    
    tamaño_archivo = models.PositiveIntegerField(
        default=0,
        verbose_name="Tamaño del Archivo",
        help_text="Tamaño del archivo en bytes"
    )
    
    # Campos de auditoría
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Subida",
        help_text="Fecha y hora en que se subió el archivo"
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción",
        help_text="Descripción opcional del contenido del archivo"
    )
    
    # Campo para eliminación lógica
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado",
        help_text="Indica si el archivo ha sido eliminado lógicamente"
    )
    
    fecha_eliminacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Eliminación",
        help_text="Fecha y hora en que se eliminó lógicamente el archivo"
    )
    
    # Manager personalizado para archivos activos
    objects = models.Manager()  # Manager por defecto
    
    class ArchivosActivosManager(models.Manager):
        """Manager que devuelve solo archivos no eliminados"""
        def get_queryset(self):
            return super().get_queryset().filter(eliminado=False)
    
    activos = ArchivosActivosManager()

    class Meta:
        verbose_name = "Archivo de Cotización"
        verbose_name_plural = "Archivos de Cotización"
        ordering = ['-fecha_subida']
        indexes = [
            models.Index(fields=['cotizacion', 'tipo_archivo']),
            models.Index(fields=['fecha_subida']),
        ]

    def __str__(self):
        return f"{self.nombre_original} - {self.cotizacion.numero_cotizacion}"
    
    @property
    def extension(self):
        """Devuelve la extensión del archivo"""
        return os.path.splitext(self.nombre_original)[1].lower()
    
    @property
    def es_pdf(self):
        """Verifica si el archivo es un PDF"""
        return self.extension == '.pdf'
    
    @property
    def es_imagen(self):
        """Verifica si el archivo es una imagen"""
        extensiones_imagen = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        return self.extension in extensiones_imagen
    
    @property
    def es_xml(self):
        """Verifica si el archivo es XML"""
        return self.extension == '.xml'
    
    @property
    def tamaño_formateado(self):
        """Devuelve el tamaño del archivo en formato legible"""
        if not self.tamaño_archivo:
            return "0 B"
        if self.tamaño_archivo < 1024:
            return f"{self.tamaño_archivo} B"
        elif self.tamaño_archivo < 1024 * 1024:
            return f"{self.tamaño_archivo / 1024:.1f} KB"
        else:
            return f"{self.tamaño_archivo / (1024 * 1024):.1f} MB"
    
    def eliminar_logicamente(self):
        """Realiza una eliminación lógica del archivo"""
        from django.utils import timezone
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.save()
    
    def restaurar(self):
        """Restaura un archivo eliminado lógicamente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()
    
    def save(self, *args, **kwargs):
        """Sobrescribe save para detectar automáticamente el tipo y tamaño"""
        if self.archivo:
            # Establecer nombre original si no está definido
            if not self.nombre_original:
                self.nombre_original = os.path.basename(self.archivo.name)
            
            # Detectar tipo de archivo automáticamente
            if self.es_pdf:
                self.tipo_archivo = 'pdf'
            elif self.es_imagen:
                self.tipo_archivo = 'imagen'
            elif self.es_xml:
                self.tipo_archivo = 'xml'
            elif self.extension in ['.doc', '.docx', '.txt']:
                self.tipo_archivo = 'documento'
            else:
                self.tipo_archivo = 'otro'
            
            # Establecer tamaño del archivo
            if hasattr(self.archivo, 'size'):
                self.tamaño_archivo = self.archivo.size
        
        super().save(*args, **kwargs)


def oportunidad_archivo_upload_path(instance, filename):
    """
    Función para generar la ruta de subida de archivos de oportunidades.
    Organiza los archivos por oportunidad y fecha.
    """
    # Generar un nombre único para evitar conflictos
    ext = filename.split('.')[-1]
    filename = f"{uuid.uuid4().hex}.{ext}"
    
    # Organizar por año/mes/oportunidad
    fecha = timezone.now()
    return f"oportunidades/{fecha.year}/{fecha.month:02d}/{instance.oportunidad.codigo_op}/{filename}"


class OportunidadManager(models.Manager):
    """Manager personalizado para el modelo Oportunidad"""
    
    def get_queryset(self):
        """Retorna el queryset base"""
        return super().get_queryset()
    
    def activos(self):
        """Retorna solo las oportunidades no eliminadas"""
        return self.get_queryset().filter(eliminado=False)
    
    def eliminados(self):
        """Retorna solo las oportunidades eliminadas"""
        return self.get_queryset().filter(eliminado=True)


class Oportunidad(models.Model):
    """
    Modelo para gestionar las oportunidades de proyectos (OPs).
    Cada oportunidad representa un proyecto potencial con seguimiento completo.
    """
    
    # Opciones para categorías
    CATEGORIA_CHOICES = [
        ('ampliacion', 'Ampliación'),
        ('instalacion_electrica', 'Instalación Eléctrica'),
        ('mantenimiento_predictivo', 'Mantenimiento'),
        ('reparacion', 'Reparación'),
        ('automatizacion', 'Automatización'),
        ('fabricaciones', 'Fabricaciones'),
        ('servicios', 'Servicios'),
    ]
    
    # Campos principales
    codigo_op = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Código OP",
        help_text="Código único identificador de la oportunidad (ej: OP-0001)",
        db_index=True
    )
    
    categoria = models.CharField(
        max_length=30,
        choices=CATEGORIA_CHOICES,
        verbose_name="Categoría",
        help_text="Categoría del proyecto",
        db_index=True
    )
    
    # Relación con cliente (obligatorio)
    cliente = models.ForeignKey(
        Cliente,
        on_delete=models.PROTECT,  # Proteger eliminación si hay OPs asociadas
        verbose_name="Cliente",
        help_text="Cliente asociado a esta oportunidad",
        related_name="oportunidades"
    )
    
    # Información de sucursal/ubicación del cliente
    sucursal_cliente = models.JSONField(
        blank=True,
        null=True,
        verbose_name="Sucursal/Ubicación",
        help_text="Información específica de la sucursal o ubicación del cliente para esta OP"
    )
    
    # Relación muchos a muchos con cotizaciones
    cotizaciones = models.ManyToManyField(
        Cotizacion,
        blank=True,
        verbose_name="Cotizaciones",
        help_text="Cotizaciones asociadas a esta oportunidad",
        related_name="oportunidades"
    )
    
    # Relación muchos a muchos con supervisores
    supervisores = models.ManyToManyField(
        Supervisor,
        verbose_name="Supervisores",
        help_text="Supervisores asignados a esta oportunidad",
        related_name="oportunidades_asignadas"
    )
    
    # Estados de seguimiento
    facturado = models.BooleanField(
        default=False,
        verbose_name="Facturado",
        help_text="Indica si la oportunidad ha sido facturada",
        db_index=True
    )
    
    fecha_facturado = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Facturación",
        help_text="Fecha en que se marcó la oportunidad como facturada"
    )
    
    pagado = models.BooleanField(
        default=False,
        verbose_name="Pagado",
        help_text="Indica si la oportunidad ha sido pagada",
        db_index=True
    )
    
    fecha_pagado = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Pago",
        help_text="Fecha en que se marcó la oportunidad como pagada"
    )
    
    concluido = models.BooleanField(
        default=False,
        verbose_name="Concluido",
        help_text="Indica si la oportunidad ha sido concluida",
        db_index=True
    )
    
    fecha_concluido = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Conclusión",
        help_text="Fecha en que se marcó la oportunidad como concluida"
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación",
        help_text="Fecha y hora en que se registró la oportunidad"
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización",
        help_text="Fecha y hora de la última modificación"
    )
    
    # Campo para soft delete (eliminación lógica)
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado",
        help_text="Indica si la oportunidad ha sido eliminada lógicamente del sistema",
        db_index=True
    )
    
    fecha_eliminacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Eliminación",
        help_text="Fecha y hora en que se eliminó lógicamente la oportunidad"
    )
    
    # Campos adicionales
    notas = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notas",
        help_text="Notas adicionales sobre la oportunidad"
    )

    # Nuevos campos opcionales
    comprador = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Comprador",
        help_text="Nombre del comprador asignado a la oportunidad"
    )

    usuario = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Usuario",
        help_text="Usuario responsable de la oportunidad"
    )

    fecha_oc = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha OC",
        help_text="Fecha de la orden de compra (OC) asociada"
    )

    oc = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="OC",
        help_text="Número o referencia de la orden de compra (OC)"
    )

    fecha_albarran = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha Albarrán",
        help_text="Fecha del albarrán asociado a la oportunidad"
    )

    albarran = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Albarrán",
        help_text="Número o referencia del albarrán"
    )

    numero_factura = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Número de Factura",
        help_text="Número de factura correspondiente a la oportunidad"
    )
    
    # Fecha de factura
    fecha_factura = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Factura",
        help_text="Fecha en que se emitió o registró la factura"
    )

    # Manager personalizado
    objects = OportunidadManager()

    class Meta:
        verbose_name = "Oportunidad"
        verbose_name_plural = "Oportunidades"
        ordering = ['codigo_op']  # Cambiar ordering para evitar problemas con None
        indexes = [
            models.Index(fields=['codigo_op']),
            models.Index(fields=['categoria', 'eliminado']),
            models.Index(fields=['cliente', 'eliminado']),
            models.Index(fields=['facturado', 'eliminado']),
            models.Index(fields=['pagado', 'eliminado']),
            models.Index(fields=['concluido', 'eliminado']),
            models.Index(fields=['eliminado']),
            models.Index(fields=['fecha_creacion']),
        ]

    def __str__(self):
        return f"{self.codigo_op} - {self.cliente.nombre} ({self.get_categoria_display()})"
    
    @property
    def estado_completo(self):
        """Devuelve el estado completo de la oportunidad"""
        estados = []
        if self.facturado:
            estados.append("Facturado")
        if self.pagado:
            estados.append("Pagado")
        if self.concluido:
            estados.append("Concluido")
        return ", ".join(estados) if estados else "En proceso"
    
    @property
    def porcentaje_completado(self):
        """Calcula el porcentaje de completado basado en los estados"""
        total_estados = 3  # facturado, pagado, concluido
        estados_completados = sum([self.facturado, self.pagado, self.concluido])
        return round((estados_completados / total_estados) * 100, 1)
    
    @property
    def cotizaciones_str(self):
        """Devuelve una cadena con los números de cotizaciones asociadas"""
        cotizaciones_nums = self.cotizaciones.values_list('numero_cotizacion', flat=True)
        return ", ".join(cotizaciones_nums) if cotizaciones_nums else "Sin cotizaciones"
    
    @property
    def supervisores_str(self):
        """Devuelve una cadena con los nombres de supervisores asignados"""
        supervisores_nombres = self.supervisores.filter(eliminado=False).values_list('nombre', flat=True)
        return ", ".join(supervisores_nombres) if supervisores_nombres else "Sin supervisores"
    
    @property
    def total_archivos_evidencia(self):
        """Cuenta el total de archivos de evidencia no eliminados"""
        try:
            return self.archivos_evidencia.filter(eliminado=False).count()
        except:
            return 0
    
    def marcar_facturado(self, fecha=None):
        """Marca la oportunidad como facturada"""
        self.facturado = True
        self.fecha_facturado = fecha if fecha else timezone.now().date()
        self.save()
    
    def marcar_pagado(self, fecha=None):
        """Marca la oportunidad como pagada"""
        self.pagado = True
        self.fecha_pagado = fecha if fecha else timezone.now().date()
        self.save()
    
    def marcar_concluido(self, fecha=None):
        """Marca la oportunidad como concluida"""
        self.concluido = True
        self.fecha_concluido = fecha if fecha else timezone.now().date()
        self.save()
    
    def eliminar_logicamente(self):
        """Método para eliminar lógicamente la oportunidad"""
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.save()
    
    def restaurar(self):
        """Método para restaurar una oportunidad eliminada lógicamente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()
    
    def asignar_cotizacion(self, cotizacion):
        """Asigna una cotización a la oportunidad y marca la cotización como asignada"""
        self.cotizaciones.add(cotizacion)
        cotizacion.asignado = True
        cotizacion.save()
    
    def desasignar_cotizacion(self, cotizacion):
        """Desasigna una cotización de la oportunidad"""
        self.cotizaciones.remove(cotizacion)
        # Verificar si la cotización está asignada a otras oportunidades
        if not cotizacion.oportunidades.exists():
            cotizacion.asignado = False
            cotizacion.save()
    
    @classmethod
    def activas(cls):
        """Retorna solo las oportunidades no eliminadas"""
        return cls.objects.filter(eliminado=False)
    
    @classmethod
    def eliminadas(cls):
        """Retorna solo las oportunidades eliminadas"""
        return cls.objects.filter(eliminado=True)
    
    @classmethod
    def por_estado(cls, facturado=None, pagado=None, concluido=None):
        """Filtra oportunidades por estado"""
        queryset = cls.activas()
        
        if facturado is not None:
            queryset = queryset.filter(facturado=facturado)
        if pagado is not None:
            queryset = queryset.filter(pagado=pagado)
        if concluido is not None:
            queryset = queryset.filter(concluido=concluido)
            
        return queryset
    
    @classmethod
    def por_cliente(cls, cliente_id):
        """Filtra oportunidades por cliente"""
        return cls.activas().filter(cliente_id=cliente_id)
    
    @classmethod
    def por_categoria(cls, categoria):
        """Filtra oportunidades por categoría"""
        return cls.activas().filter(categoria=categoria)
    
    @classmethod
    def generar_codigo_op(cls):
        """Genera el siguiente código de OP disponible"""
        ultimo_numero = 0
        
        # Buscar el último número de OP
        ultima_op = cls.objects.filter(
            codigo_op__startswith='OP-'
        ).order_by('-codigo_op').first()
        
        if ultima_op:
            try:
                # Extraer el número del código OP-XXXX
                numero_str = ultima_op.codigo_op.split('-')[1]
                ultimo_numero = int(numero_str)
            except (IndexError, ValueError):
                pass
        
        return f"OP-{(ultimo_numero + 1):04d}"


class ArchivoEvidenciaOportunidad(models.Model):
    """
    Modelo para gestionar los archivos de evidencia de las oportunidades.
    Almacena archivos de evidencia documental relacionados con cada oportunidad.
    """
    
    TIPO_ARCHIVO_CHOICES = [
        ('pdf', 'PDF'),
        ('imagen', 'Imagen'),
        ('documento', 'Documento'),
        ('video', 'Video'),
        ('comprobante', 'Comprobante'),
        ('otro', 'Otro'),
    ]
    
    # Relación con oportunidad
    oportunidad = models.ForeignKey(
        Oportunidad,
        on_delete=models.CASCADE,  # Si se elimina la oportunidad, se eliminan sus archivos
        verbose_name="Oportunidad",
        help_text="Oportunidad a la que pertenece este archivo de evidencia",
        related_name="archivos_evidencia"
    )
    
    # Información del archivo
    archivo = models.FileField(
        upload_to=oportunidad_archivo_upload_path,
        verbose_name="Archivo de Evidencia",
        help_text="Archivo de evidencia adjunto a la oportunidad"
    )
    
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre Original",
        help_text="Nombre original del archivo subido"
    )
    
    tipo_archivo = models.CharField(
        max_length=20,
        choices=TIPO_ARCHIVO_CHOICES,
        default='otro',
        verbose_name="Tipo de Archivo",
        help_text="Categoría del archivo de evidencia"
    )
    
    tamaño_archivo = models.PositiveIntegerField(
        default=0,
        verbose_name="Tamaño del Archivo",
        help_text="Tamaño del archivo en bytes"
    )
    
    # Campos de auditoría
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Subida",
        help_text="Fecha y hora en que se subió el archivo"
    )
    
    descripcion = models.TextField(
        blank=True,
        null=True,
        verbose_name="Descripción",
        help_text="Descripción opcional del contenido del archivo de evidencia"
    )
    
    # Campo para eliminación lógica
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado",
        help_text="Indica si el archivo ha sido eliminado lógicamente"
    )
    
    fecha_eliminacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Eliminación",
        help_text="Fecha y hora en que se eliminó lógicamente el archivo"
    )
    
    # Manager personalizado para archivos activos
    objects = models.Manager()  # Manager por defecto
    
    class ArchivosActivosManager(models.Manager):
        """Manager que devuelve solo archivos no eliminados"""
        def get_queryset(self):
            return super().get_queryset().filter(eliminado=False)
    
    activos = ArchivosActivosManager()

    class Meta:
        verbose_name = "Archivo de Evidencia"
        verbose_name_plural = "Archivos de Evidencia"
        ordering = ['-fecha_subida']
        indexes = [
            models.Index(fields=['oportunidad', 'tipo_archivo']),
            models.Index(fields=['fecha_subida']),
            models.Index(fields=['eliminado']),
        ]

    def __str__(self):
        return f"{self.nombre_original} - {self.oportunidad.codigo_op}"
    
    @property
    def extension(self):
        """Devuelve la extensión del archivo"""
        return os.path.splitext(self.nombre_original)[1].lower()
    
    @property
    def es_pdf(self):
        """Verifica si el archivo es un PDF"""
        return self.extension == '.pdf'
    
    @property
    def es_imagen(self):
        """Verifica si el archivo es una imagen"""
        extensiones_imagen = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp']
        return self.extension in extensiones_imagen
    
    @property
    def es_video(self):
        """Verifica si el archivo es un video"""
        extensiones_video = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm']
        return self.extension in extensiones_video
    
    @property
    def tamaño_formateado(self):
        """Devuelve el tamaño del archivo en formato legible"""
        if not self.tamaño_archivo:
            return "0 B"
        if self.tamaño_archivo < 1024:
            return f"{self.tamaño_archivo} B"
        elif self.tamaño_archivo < 1024 * 1024:
            return f"{self.tamaño_archivo / 1024:.1f} KB"
        else:
            return f"{self.tamaño_archivo / (1024 * 1024):.1f} MB"
    
    def eliminar_logicamente(self):
        """Realiza una eliminación lógica del archivo"""
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.save()
    
    def restaurar(self):
        """Restaura un archivo eliminado lógicamente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()
    
    def save(self, *args, **kwargs):
        """Sobrescribe save para detectar automáticamente el tipo y tamaño"""
        if self.archivo:
            # Establecer nombre original si no está definido
            if not self.nombre_original:
                self.nombre_original = os.path.basename(self.archivo.name)
            
            # Detectar tipo de archivo automáticamente
            if self.es_pdf:
                self.tipo_archivo = 'pdf'
            elif self.es_imagen:
                self.tipo_archivo = 'imagen'
            elif self.es_video:
                self.tipo_archivo = 'video'
            elif self.extension in ['.doc', '.docx', '.txt', '.xls', '.xlsx']:
                self.tipo_archivo = 'documento'
            elif self.extension in ['.pdf'] and 'factura' in self.nombre_original.lower():
                self.tipo_archivo = 'comprobante'
            else:
                self.tipo_archivo = 'otro'
            
            # Establecer tamaño del archivo
            if hasattr(self.archivo, 'size'):
                self.tamaño_archivo = self.archivo.size
        
        super().save(*args, **kwargs)


# Modelos para documentos de estados de Oportunidad
def upload_to_facturado(instance, filename):
    """Función para definir la ruta de subida de archivos de facturación"""
    return f'oportunidades/{instance.oportunidad.codigo_op}/facturado/{filename}'

def upload_to_pagado(instance, filename):
    """Función para definir la ruta de subida de archivos de pagos"""
    return f'oportunidades/{instance.oportunidad.codigo_op}/pagado/{filename}'

def upload_to_concluido(instance, filename):
    """Función para definir la ruta de subida de archivos de conclusión"""
    return f'oportunidades/{instance.oportunidad.codigo_op}/concluido/{filename}'


class ArchivoFacturadoOportunidad(models.Model):
    """
    Modelo para gestionar archivos de evidencia de facturación de oportunidades
    """
    
    # Relación con la oportunidad
    oportunidad = models.ForeignKey(
        Oportunidad,
        on_delete=models.CASCADE,
        related_name='archivos_facturado',
        verbose_name="Oportunidad",
        help_text="Oportunidad a la que pertenece este archivo de facturación"
    )
    
    # Archivo
    archivo = models.FileField(
        upload_to=upload_to_facturado,
        verbose_name="Archivo de Facturación",
        help_text="Archivo que evidencia la facturación (factura, comprobante, etc.)"
    )
    
    # Metadata del archivo
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre Original",
        help_text="Nombre original del archivo subido"
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción opcional del documento"
    )
    
    # Campos de auditoría
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Subida"
    )
    
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado"
    )
    
    class Meta:
        verbose_name = "Archivo de Facturación"
        verbose_name_plural = "Archivos de Facturación"
        ordering = ['-fecha_subida']
    
    def __str__(self):
        return f"Facturación {self.oportunidad.codigo_op} - {self.nombre_original}"


class ArchivoPagadoOportunidad(models.Model):
    """
    Modelo para gestionar archivos de evidencia de pagos de oportunidades
    """
    
    # Relación con la oportunidad
    oportunidad = models.ForeignKey(
        Oportunidad,
        on_delete=models.CASCADE,
        related_name='archivos_pagado',
        verbose_name="Oportunidad",
        help_text="Oportunidad a la que pertenece este archivo de pago"
    )
    
    # Archivo
    archivo = models.FileField(
        upload_to=upload_to_pagado,
        verbose_name="Archivo de Pago",
        help_text="Archivo que evidencia el pago (comprobante de pago, transferencia, etc.)"
    )
    
    # Metadata del archivo
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre Original",
        help_text="Nombre original del archivo subido"
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción opcional del documento"
    )
    
    # Campos de auditoría
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Subida"
    )
    
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado"
    )
    
    class Meta:
        verbose_name = "Archivo de Pago"
        verbose_name_plural = "Archivos de Pago"
        ordering = ['-fecha_subida']
    
    def __str__(self):
        return f"Pago {self.oportunidad.codigo_op} - {self.nombre_original}"


class ArchivoConcluidoOportunidad(models.Model):
    """
    Modelo para gestionar archivos de evidencia de conclusión de oportunidades
    """
    
    # Relación con la oportunidad
    oportunidad = models.ForeignKey(
        Oportunidad,
        on_delete=models.CASCADE,
        related_name='archivos_concluido',
        verbose_name="Oportunidad",
        help_text="Oportunidad a la que pertenece este archivo de conclusión"
    )
    
    # Archivo
    archivo = models.FileField(
        upload_to=upload_to_concluido,
        verbose_name="Archivo de Conclusión",
        help_text="Archivo que evidencia la conclusión del proyecto (acta de entrega, fotos finales, etc.)"
    )
    
    # Metadata del archivo
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre Original",
        help_text="Nombre original del archivo subido"
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción opcional del documento"
    )
    
    # Campos de auditoría
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Subida"
    )
    
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado"
    )
    
    class Meta:
        verbose_name = "Archivo de Conclusión"
        verbose_name_plural = "Archivos de Conclusión"
        ordering = ['-fecha_subida']
    
    def __str__(self):
        return f"Conclusión {self.oportunidad.codigo_op} - {self.nombre_original}"


# Funciones para rutas de archivos de compras
def upload_to_compra_facturado(instance, filename):
    """Función para definir la ruta de subida de archivos de facturación de compras"""
    if instance.compra.oportunidad:
        op_code = instance.compra.oportunidad.codigo_op
    else:
        op_code = "INTERNOS"
    return f'compras/{op_code}/facturado/{filename}'

def upload_to_compra_pagado(instance, filename):
    """Función para definir la ruta de subida de archivos de pagos de compras"""
    if instance.compra.oportunidad:
        op_code = instance.compra.oportunidad.codigo_op
    else:
        op_code = "INTERNOS"
    return f'compras/{op_code}/pagado/{filename}'

def upload_to_compra_concluido(instance, filename):
    """Función para definir la ruta de subida de archivos de conclusión de compras"""
    if instance.compra.oportunidad:
        op_code = instance.compra.oportunidad.codigo_op
    else:
        op_code = "INTERNOS"
    return f'compras/{op_code}/concluido/{filename}'


class CompraManager(models.Manager):
    """Manager personalizado para el modelo Compra"""
    
    def get_queryset(self):
        return super().get_queryset().filter(eliminado=False)
    
    def activas(self):
        return self.get_queryset()
    
    def eliminadas(self):
        return super().get_queryset().filter(eliminado=True)
    
    def por_proyecto(self):
        """Retorna compras asociadas a proyectos (oportunidades)"""
        return self.get_queryset().filter(oportunidad__isnull=False)
    
    def internas(self):
        """Retorna compras internas (gastos internos)"""
        return self.get_queryset().filter(oportunidad__isnull=True)


class Compra(models.Model):
    """
    Modelo para gestionar las compras del sistema.
    Maneja tanto compras para proyectos (OPs) como gastos internos.
    """
    
    # Tipos de compra
    TIPO_COMPRA_CHOICES = [
        ('proyecto', 'Compra para Proyecto'),
        ('interno', 'Gasto Interno'),
    ]
    
    # Tipos específicos de compra para proyectos
    TIPO_COMPRA_PROYECTO_CHOICES = [
        ('material', 'Compra de Material'),
        ('mano_obra', 'Gasto por Mano de Obra'),
    ]
    
    # Campos principales
    tipo_compra = models.CharField(
        max_length=20,
        choices=TIPO_COMPRA_CHOICES,
        verbose_name="Tipo de Compra",
        help_text="Indica si es una compra para proyecto o gasto interno",
        db_index=True
    )
    
    # Relación con oportunidad (solo para compras de proyecto)
    oportunidad = models.ForeignKey(
        Oportunidad,
        on_delete=models.PROTECT,
        verbose_name="Oportunidad (OP)",
        help_text="Oportunidad asociada a esta compra (solo para compras de proyecto)",
        related_name="compras",
        blank=True,
        null=True
    )
    
    # Relación con cotización (solo para compras de proyecto)
    cotizacion = models.ForeignKey(
        'Cotizacion',
        on_delete=models.PROTECT,
        verbose_name="Cotización",
        help_text="Cotización asociada a esta compra (solo para compras de proyecto)",
        related_name="compras",
        blank=True,
        null=True
    )
    
    # Relación con nomenclatura (solo para gastos internos)
    nomenclatura = models.ForeignKey(
        Nomenclatura,
        on_delete=models.PROTECT,
        verbose_name="Nomenclatura",
        help_text="Nomenclatura para categorizar el gasto interno",
        related_name="compras",
        blank=True,
        null=True
    )
    
    # Relación con proveedor
    proveedor = models.ForeignKey(
        Proveedor,
        on_delete=models.PROTECT,
        verbose_name="Proveedor",
        help_text="Proveedor de la compra",
        related_name="compras"
    )
    
    # Relación con método de pago
    metodo_pago = models.ForeignKey(
        TarjetaPago,
        on_delete=models.PROTECT,
        verbose_name="Método de Pago",
        help_text="Método de pago utilizado para la compra",
        related_name="compras",
        blank=True,
        null=True
    )
    
    # Relación con supervisor
    supervisor = models.ForeignKey(
        Supervisor,
        on_delete=models.PROTECT,
        verbose_name="Supervisor",
        help_text="Supervisor asignado a esta compra",
        related_name="compras",
        blank=True,
        null=True
    )
    
    # Supervisor responsable de la compra (quien la solicitó)
    supervisor_responsable_compra = models.ForeignKey(
        Supervisor,
        on_delete=models.PROTECT,
        verbose_name="Supervisor Responsable de Compra",
        help_text="Supervisor que solicitó o autorizó esta compra",
        related_name="compras_responsable",
        blank=True,
        null=True
    )
    
    # Información de la compra
    concepto = models.CharField(
        max_length=255,
        verbose_name="Concepto",
        help_text="Concepto o resumen de la compra"
    )
    
    descripcion = models.TextField(
        verbose_name="Descripción",
        help_text="Descripción detallada de la compra"
    )
    
    fecha_compra = models.DateField(
        verbose_name="Fecha de Compra",
        help_text="Fecha en que se realizó la compra",
        db_index=True
    )
    
    unidades = models.PositiveIntegerField(
        verbose_name="Unidades",
        help_text="Cantidad de unidades compradas",
        default=1
    )
    
    costo_total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Costo Total",
        help_text="Costo total de la compra"
    )
    
    # Estados de la compra
    facturado = models.BooleanField(
        default=False,
        verbose_name="Facturado",
        help_text="Indica si la compra ha sido facturada",
        db_index=True
    )
    
    fecha_facturado = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Facturación",
        help_text="Fecha en que se marcó como facturado"
    )
    
    pagado = models.BooleanField(
        default=False,
        verbose_name="Pagado",
        help_text="Indica si la compra ha sido pagada",
        db_index=True
    )
    
    fecha_pagado = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Pago",
        help_text="Fecha en que se marcó como pagado"
    )
    
    concluido = models.BooleanField(
        default=False,
        verbose_name="Concluido",
        help_text="Indica si la compra ha sido concluida/entregada",
        db_index=True
    )
    
    fecha_concluido = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Conclusión",
        help_text="Fecha en que se marcó como concluido"
    )
    
    # Notas adicionales
    notas = models.TextField(
        blank=True,
        null=True,
        verbose_name="Notas",
        help_text="Notas adicionales sobre la compra"
    )
    
    # Número de factura
    numero_factura = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Número de Factura",
        help_text="Número de factura correspondiente a la compra"
    )
    
    # Fecha de factura
    fecha_factura = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Factura",
        help_text="Fecha en que se emitió o registró la factura"
    )
    
    # Campos para manejo de fechas de pago de crédito
    fecha_pago_credito = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Pago Crédito",
        help_text="Fecha límite para pagar al proveedor (se calcula automáticamente si el proveedor maneja crédito)",
        db_index=True
    )
    
    # Tipo específico de compra para proyectos
    tipo_compra_proyecto = models.CharField(
        max_length=20,
        choices=TIPO_COMPRA_PROYECTO_CHOICES,
        blank=True,
        null=True,
        verbose_name="Tipo de Compra Proyecto",
        help_text="Especifica si es compra de material o gasto por mano de obra (solo para compras de proyecto)",
        db_index=True
    )
    
    # Fecha de pago definida por el usuario
    fecha_pago_usuario = models.DateField(
        blank=True,
        null=True,
        verbose_name="Fecha de Pago Usuario",
        help_text="Fecha de recordatorio de pago definida por el usuario según flujos del negocio",
        db_index=True
    )
    
    # Campo booleano para identificar si es mano de obra
    es_mano_obra = models.BooleanField(
        default=False,
        verbose_name="Es Mano de Obra",
        help_text="Indica si esta compra es específicamente para mano de obra",
        db_index=True
    )
    
    # Total calculado para mano de obra
    total_mano_obra = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        verbose_name="Total Mano de Obra",
        help_text="Total calculado desde los detalles de mano de obra"
    )
    
    # Campos específicos para mano de obra (JSON para almacenar los bloques)
    mano_obra_detalle = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Detalle Mano de Obra",
        help_text="Detalle de los bloques de mano de obra con puestos, horas y tarifas"
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación",
        help_text="Fecha y hora en que se registró la compra"
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización",
        help_text="Fecha y hora de la última modificación"
    )
    
    # Campo para soft delete (eliminación lógica)
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado",
        help_text="Indica si la compra ha sido eliminada lógicamente del sistema",
        db_index=True
    )
    
    fecha_eliminacion = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Fecha de Eliminación",
        help_text="Fecha y hora en que se eliminó lógicamente la compra"
    )
    
    # Manager personalizado
    objects = CompraManager()

    class Meta:
        verbose_name = "Compra"
        verbose_name_plural = "Compras"
        ordering = ['-fecha_compra', '-fecha_creacion']
        indexes = [
            models.Index(fields=['tipo_compra', 'fecha_compra']),
            models.Index(fields=['oportunidad', 'facturado']),
            models.Index(fields=['proveedor', 'fecha_compra']),
            models.Index(fields=['eliminado']),
            models.Index(fields=['facturado', 'pagado', 'concluido']),
        ]

    def __str__(self):
        if self.oportunidad:
            return f"Compra {self.concepto} - {self.oportunidad.codigo_op}"
        else:
            return f"Compra Interna {self.concepto} - {self.nomenclatura.clave if self.nomenclatura else 'Sin nomenclatura'}"
    
    @property
    def es_compra_proyecto(self):
        """Indica si es una compra para proyecto (con oportunidad asignada)"""
        return self.tipo_compra == 'proyecto' and self.oportunidad is not None
    
    @property
    def es_compra_proyecto_sin_asignar(self):
        """Indica si es una compra de proyecto pero sin oportunidad asignada"""
        return self.tipo_compra == 'proyecto' and self.oportunidad is None
    
    @property
    def es_gasto_interno(self):
        """Indica si es un gasto interno"""
        return self.tipo_compra == 'interno' and self.nomenclatura is not None
    
    @property
    def requiere_asignacion(self):
        """Indica si la compra requiere ser asignada a una oportunidad"""
        return self.es_compra_proyecto_sin_asignar
    
    @property
    def estado_asignacion(self):
        """Retorna el estado de asignación de la compra"""
        if self.tipo_compra == 'proyecto':
            return 'Asignada' if self.oportunidad else 'Pendiente de Asignación'
        elif self.tipo_compra == 'interno':
            return 'Gasto Interno'
        return 'Desconocido'
    
    @property
    def estado_completo(self):
        """Indica si la compra está completamente procesada"""
        return self.facturado and self.pagado and self.concluido
    
    @property
    def codigo_referencia(self):
        """Retorna el código de referencia según el tipo de compra y estado de asignación"""
        if self.oportunidad:
            return self.oportunidad.codigo_op
        elif self.nomenclatura:
            return self.nomenclatura.clave
        elif self.tipo_compra == 'proyecto':
            return "PENDIENTE-ASIGN"
        else:
            return "SIN-REF"
    
    def asignar_oportunidad(self, oportunidad):
        """
        Asigna una oportunidad a una compra de proyecto sin asignar
        
        Args:
            oportunidad (Oportunidad): La oportunidad a asignar
            
        Raises:
            ValidationError: Si la compra no es de tipo proyecto o ya tiene oportunidad asignada
        """
        from django.core.exceptions import ValidationError
        
        if self.tipo_compra != 'proyecto':
            raise ValidationError('Solo se pueden asignar oportunidades a compras de proyecto.')
        
        if self.oportunidad is not None:
            raise ValidationError('Esta compra ya tiene una oportunidad asignada.')
        
        if oportunidad.eliminado:
            raise ValidationError('No se puede asignar una oportunidad eliminada.')
        
        self.oportunidad = oportunidad
        self.save()
    
    def desasignar_oportunidad(self):
        """
        Desasigna la oportunidad de una compra de proyecto
        
        Raises:
            ValidationError: Si la compra no es de tipo proyecto o no tiene oportunidad asignada
        """
        from django.core.exceptions import ValidationError
        
        if self.tipo_compra != 'proyecto':
            raise ValidationError('Solo las compras de proyecto pueden ser desasignadas.')
        
        if self.oportunidad is None:
            raise ValidationError('Esta compra no tiene oportunidad asignada.')
        
        self.oportunidad = None
        self.save()
    
    def marcar_facturado(self, fecha=None):
        """Marca la compra como facturada"""
        self.facturado = True
        self.fecha_facturado = fecha if fecha else timezone.now().date()
        self.save()
    
    def marcar_pagado(self, fecha=None):
        """Marca la compra como pagada"""
        self.pagado = True
        self.fecha_pagado = fecha if fecha else timezone.now().date()
        self.save()
    
    def marcar_concluido(self, fecha=None):
        """Marca la compra como concluida"""
        self.concluido = True
        self.fecha_concluido = fecha if fecha else timezone.now().date()
        self.save()
    
    def eliminar_logicamente(self):
        """Realiza una eliminación lógica de la compra"""
        self.eliminado = True
        self.fecha_eliminacion = timezone.now()
        self.save()
    
    def restaurar(self):
        """Restaura una compra eliminada lógicamente"""
        self.eliminado = False
        self.fecha_eliminacion = None
        self.save()
    
    def clean(self):
        """Validaciones personalizadas del modelo"""
        from django.core.exceptions import ValidationError
        
        # Validar que los gastos internos tengan nomenclatura asignada
        if self.tipo_compra == 'interno' and not self.nomenclatura:
            raise ValidationError({
                'nomenclatura': 'Los gastos internos deben tener una nomenclatura asignada.'
            })
        
        # Validar que no se asigne oportunidad a gastos internos
        if self.tipo_compra == 'interno' and self.oportunidad:
            raise ValidationError({
                'oportunidad': 'Los gastos internos no pueden tener oportunidad asignada.'
            })
        
        # Validar que no se asigne nomenclatura a compras de proyecto
        if self.tipo_compra == 'proyecto' and self.nomenclatura:
            raise ValidationError({
                'nomenclatura': 'Las compras de proyecto no pueden tener nomenclatura asignada.'
            })
        
        # NOTA: Las compras de proyecto pueden crearse sin oportunidad asignada
        # y ser asignadas posteriormente. Esto es válido y profesional.
    
    def calcular_fecha_pago_credito(self):
        """
        Calcula y actualiza la fecha de pago de crédito basada en el proveedor.
        Si el usuario especifica una fecha_pago_usuario, se usa esa fecha en su lugar.
        """
        from datetime import timedelta
        
        # Si el usuario especifica una fecha de pago personalizada, usar esa
        if self.fecha_pago_usuario:
            self.fecha_pago_credito = self.fecha_pago_usuario
        # Si no hay fecha personalizada, calcular basado en el proveedor
        elif self.proveedor and self.proveedor.maneja_credito and self.proveedor.dias_credito:
            self.fecha_pago_credito = self.fecha_compra + timedelta(days=self.proveedor.dias_credito)
        else:
            self.fecha_pago_credito = None
    
    @property
    def dias_para_vencimiento(self):
        """
        Calcula los días que faltan para el vencimiento del pago de crédito
        Retorna None si no hay fecha de pago de crédito o si ya está pagado
        """
        if not self.fecha_pago_credito or self.pagado:
            return None
        
        from datetime import date
        hoy = date.today()
        delta = self.fecha_pago_credito - hoy
        return delta.days
    
    @property
    def estado_pago_credito(self):
        """
        Retorna el estado del pago de crédito categorizado por colores
        """
        if self.pagado:
            return 'pagado'
        
        if not self.fecha_pago_credito:
            return 'sin_credito'
        
        dias = self.dias_para_vencimiento
        if dias is None:
            return 'sin_credito'
        
        if dias < 0:
            return 'vencido'
        elif dias < 3:
            return 'critico'  # Rojo
        elif dias < 10:
            return 'proximo'  # Amarillo
        else:
            return 'normal'   # Verde
    
    @property
    def estado_pago_credito_display(self):
        """
        Retorna una representación legible del estado de pago de crédito
        """
        estado = self.estado_pago_credito
        dias = self.dias_para_vencimiento
        
        if estado == 'pagado':
            return 'Pagado'
        elif estado == 'sin_credito':
            return 'Sin crédito'
        elif estado == 'vencido':
            return f'Vencido ({abs(dias)} días)'
        elif estado == 'critico':
            return f'Crítico ({dias} días)'
        elif estado == 'proximo':
            return f'Próximo ({dias} días)'
        elif estado == 'normal':
            return f'Normal ({dias} días)'
        
        return 'Desconocido'
    
    def save(self, *args, **kwargs):
        """Sobrescribe save para ejecutar validaciones"""
        self.clean()
        
        # Calcular fecha de pago de crédito antes de guardar
        if self.proveedor:
            self.calcular_fecha_pago_credito()
        
        super().save(*args, **kwargs)
    
    @classmethod
    def activas(cls):
        """Retorna compras activas (no eliminadas)"""
        return cls.objects.activas()
    
    @classmethod
    def eliminadas(cls):
        """Retorna compras eliminadas lógicamente"""
        return cls.objects.eliminadas()
    
    @classmethod
    def por_oportunidad(cls, oportunidad_id):
        """Retorna compras asociadas a una oportunidad específica"""
        return cls.objects.filter(oportunidad_id=oportunidad_id)
    
    @classmethod
    def por_nomenclatura(cls, nomenclatura_id):
        """Retorna gastos internos asociados a una nomenclatura específica"""
        return cls.objects.filter(nomenclatura_id=nomenclatura_id)
    
    @classmethod
    def por_estado(cls, facturado=None, pagado=None, concluido=None):
        """Filtra compras por estado"""
        queryset = cls.objects.all()
        if facturado is not None:
            queryset = queryset.filter(facturado=facturado)
        if pagado is not None:
            queryset = queryset.filter(pagado=pagado)
        if concluido is not None:
            queryset = queryset.filter(concluido=concluido)
        return queryset


class DetalleManoObraCompra(models.Model):
    """
    Modelo para gestionar los detalles de mano de obra de una compra
    """
    
    # Relación con la compra
    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        related_name='detalles_mano_obra',
        verbose_name="Compra",
        help_text="Compra a la que pertenece este detalle de mano de obra"
    )
    
    # Relación con el puesto de mano de obra
    puesto = models.ForeignKey(
        ManoDeObra,
        on_delete=models.PROTECT,
        verbose_name="Puesto",
        help_text="Puesto de mano de obra"
    )
    
    # Horas trabajadas
    horas_trabajadas = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Horas Trabajadas",
        help_text="Número de horas trabajadas"
    )
    
    # Tarifa por hora (se autocompleta desde ManoDeObra)
    tarifa_hora = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        verbose_name="Tarifa por Hora",
        help_text="Tarifa por hora del puesto"
    )
    
    # Subtotal (horas * tarifa)
    subtotal = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Subtotal",
        help_text="Subtotal calculado (horas × tarifa)"
    )
    
    # Horas extras (monto opcional)
    horas_extras = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        verbose_name="Horas Extras",
        help_text="Monto adicional por horas extras"
    )
    
    # Total (subtotal + horas extras)
    total = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        verbose_name="Total",
        help_text="Total calculado (subtotal + horas extras)"
    )
    
    # Campos de auditoría
    fecha_creacion = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Creación"
    )
    
    fecha_actualizacion = models.DateTimeField(
        auto_now=True,
        verbose_name="Última Actualización"
    )

    class Meta:
        verbose_name = "Detalle Mano de Obra Compra"
        verbose_name_plural = "Detalles Mano de Obra Compras"
        ordering = ['puesto__puesto']

    def __str__(self):
        return f"{self.puesto.puesto} - {self.horas_trabajadas}h - ${self.total}"
    
    def save(self, *args, **kwargs):
        """Override save para calcular subtotal y total automáticamente"""
        self.subtotal = self.horas_trabajadas * self.tarifa_hora
        self.total = self.subtotal + self.horas_extras
        super().save(*args, **kwargs)


class ArchivoFacturadoCompra(models.Model):
    """
    Modelo para gestionar archivos de evidencia de facturación de compras
    """
    
    # Relación con la compra
    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        related_name='archivos_facturado',
        verbose_name="Compra",
        help_text="Compra a la que pertenece este archivo de facturación"
    )
    
    # Archivo
    archivo = models.FileField(
        upload_to=upload_to_compra_facturado,
        verbose_name="Archivo de Facturación",
        help_text="Archivo que evidencia la facturación (factura, comprobante, etc.)"
    )
    
    # Metadata del archivo
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre Original",
        help_text="Nombre original del archivo subido"
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción opcional del documento"
    )
    
    # Campos de auditoría
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Subida"
    )
    
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado"
    )
    
    class Meta:
        verbose_name = "Archivo de Facturación de Compra"
        verbose_name_plural = "Archivos de Facturación de Compras"
        ordering = ['-fecha_subida']
    
    def __str__(self):
        return f"Facturación Compra {self.compra.codigo_referencia} - {self.nombre_original}"


class ArchivoPagadoCompra(models.Model):
    """
    Modelo para gestionar archivos de evidencia de pagos de compras
    """
    
    # Relación con la compra
    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        related_name='archivos_pagado',
        verbose_name="Compra",
        help_text="Compra a la que pertenece este archivo de pago"
    )
    
    # Archivo
    archivo = models.FileField(
        upload_to=upload_to_compra_pagado,
        verbose_name="Archivo de Pago",
        help_text="Archivo que evidencia el pago (comprobante de pago, transferencia, etc.)"
    )
    
    # Metadata del archivo
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre Original",
        help_text="Nombre original del archivo subido"
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción opcional del documento"
    )
    
    # Campos de auditoría
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Subida"
    )
    
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado"
    )
    
    class Meta:
        verbose_name = "Archivo de Pago de Compra"
        verbose_name_plural = "Archivos de Pago de Compras"
        ordering = ['-fecha_subida']
    
    def __str__(self):
        return f"Pago Compra {self.compra.codigo_referencia} - {self.nombre_original}"


class ArchivoConcluidoCompra(models.Model):
    """
    Modelo para gestionar archivos de evidencia de conclusión de compras
    """
    
    # Relación con la compra
    compra = models.ForeignKey(
        Compra,
        on_delete=models.CASCADE,
        related_name='archivos_concluido',
        verbose_name="Compra",
        help_text="Compra a la que pertenece este archivo de conclusión"
    )
    
    # Archivo
    archivo = models.FileField(
        upload_to=upload_to_compra_concluido,
        verbose_name="Archivo de Conclusión",
        help_text="Archivo que evidencia la conclusión/entrega de la compra"
    )
    
    # Metadata del archivo
    nombre_original = models.CharField(
        max_length=255,
        verbose_name="Nombre Original",
        help_text="Nombre original del archivo subido"
    )
    
    descripcion = models.TextField(
        blank=True,
        verbose_name="Descripción",
        help_text="Descripción opcional del documento"
    )
    
    # Campos de auditoría
    fecha_subida = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Fecha de Subida"
    )
    
    eliminado = models.BooleanField(
        default=False,
        verbose_name="Eliminado"
    )
    
    class Meta:
        verbose_name = "Archivo de Conclusión de Compra"
        verbose_name_plural = "Archivos de Conclusión de Compras"
        ordering = ['-fecha_subida']
    
    def __str__(self):
        return f"Conclusión Compra {self.compra.codigo_referencia} - {self.nombre_original}"

