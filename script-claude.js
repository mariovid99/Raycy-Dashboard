// Datos dummy para las órdenes de compra
const purchaseOrdersData = {
    order1: {
        title: "Compra de cemento Portland",
        provider: "Cementos Industriales S.A. de C.V.",
        payment: "Transferencia bancaria a 30 días",
        invoice: "FAC-2025-0855",
        delivery: "Pendiente",
        deliveryClass: "pending",
        comments: "Materiales en proceso de entrega. Fecha estimada: 30 de julio. Incluye cables, conectores y tableros eléctricos."
    },
    order4: {
        title: "Pintura arquitectónica",
        provider: "Pinturas y Recubrimientos Premium",
        payment: "Transferencia bancaria inmediata",
        invoice: "FAC-2025-0862",
        delivery: "Entregado",
        deliveryClass: "delivered",
        comments: "Pintura de alta calidad para exteriores. Resistente a condiciones climáticas extremas. Rendimiento superior al esperado."
    },
    order5: {
        title: "Herramientas de construcción",
        provider: "Ferretería y Construcción Monterrey",
        payment: "Pago mixto: 50% contado, 50% a crédito",
        invoice: "FAC-2025-0868",
        delivery: "Pendiente",
        deliveryClass: "pending",
        comments: "Herramientas especializadas para acabados. Entrega programada para el 29 de julio. Incluye taladros, sierras y equipo de medición."
    }
};

// Función para abrir el modal con los detalles de la orden
function openModal(orderId) {
    const modal = document.getElementById('orderModal');
    const data = purchaseOrdersData[orderId];
    
    if (data) {
        // Actualizar contenido del modal
        document.getElementById('modalTitle').textContent = data.title;
        document.getElementById('modalProvider').textContent = data.provider;
        document.getElementById('modalPayment').textContent = data.payment;
        document.getElementById('modalInvoice').textContent = data.invoice;
        
        const deliveryElement = document.getElementById('modalDelivery');
        deliveryElement.textContent = data.delivery;
        deliveryElement.className = `delivery-status ${data.deliveryClass}`;
        
        document.getElementById('modalComments').textContent = data.comments;
        
        // Mostrar modal con animación
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden'; // Prevenir scroll del body
    }
}

// Función para cerrar el modal
function closeModal() {
    const modal = document.getElementById('orderModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto'; // Restaurar scroll del body
}

// Cerrar modal al hacer clic fuera del contenido
window.onclick = function(event) {
    const modal = document.getElementById('orderModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Cerrar modal con tecla Escape
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Funcionalidad para navegación del sidebar (simulada)
document.addEventListener('DOMContentLoaded', function() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remover clase active de todos los items
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Agregar clase active al item clickeado
            this.classList.add('active');
            
            // Aquí podrías agregar lógica para cambiar el contenido
            // En esta demo, todo está en una sola vista
        });
    });
});

// Animaciones para las tarjetas de proyectos
document.addEventListener('DOMContentLoaded', function() {
    const projectCards = document.querySelectorAll('.project-card');
    const summaryCards = document.querySelectorAll('.summary-card');
    
    // Agregar animación de entrada escalonada
    projectCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 200);
    });
    
    summaryCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 100);
    });
});

// Funcionalidad para botones de proyectos (simulada)
document.addEventListener('DOMContentLoaded', function() {
    const projectButtons = document.querySelectorAll('.project-actions button');
    
    projectButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const action = this.textContent.trim();
            const projectCard = this.closest('.project-card');
            const projectName = projectCard.querySelector('h3').textContent;
            
            // Simulación de feedback visual
            const originalText = this.textContent;
            const originalBackground = this.style.backgroundColor;
            
            if (action === 'Ver Detalles') {
                this.textContent = 'Cargando...';
                this.style.backgroundColor = '#6b7280';
                
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.backgroundColor = originalBackground;
                    
                    // Aquí podrías abrir un modal con detalles del proyecto
                    console.log(`Abriendo detalles de: ${projectName}`);
                }, 1000);
                
            } else if (action === 'Editar') {
                this.textContent = 'Editando...';
                this.style.backgroundColor = '#059669';
                
                setTimeout(() => {
                    this.textContent = originalText;
                    this.style.backgroundColor = originalBackground;
                    
                    // Aquí podrías abrir un formulario de edición
                    console.log(`Editando proyecto: ${projectName}`);
                }, 1000);
            }
        });
    });
});

// Actualización en tiempo real simulada para las barras de progreso
document.addEventListener('DOMContentLoaded', function() {
    const progressBars = document.querySelectorAll('.progress-fill');
    
    // Animación inicial de las barras de progreso
    progressBars.forEach((bar, index) => {
        const finalWidth = bar.style.width;
        bar.style.width = '0%';
        
        setTimeout(() => {
            bar.style.transition = 'width 1.5s ease-out';
            bar.style.width = finalWidth;
        }, 500 + (index * 300));
    });
});

// Funcionalidad de búsqueda en tabla (para futuras mejoras)
function initTableSearch() {
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Buscar órdenes de compra...';
    searchInput.className = 'table-search';
    
    // Agregar estilos al input de búsqueda
    searchInput.style.cssText = `
        width: 300px;
        padding: 8px 12px;
        border: 1px solid var(--gray-300);
        border-radius: var(--border-radius);
        font-size: 14px;
        margin-bottom: 16px;
    `;
    
    const purchaseSection = document.querySelector('.purchase-orders-section');
    const tableContainer = document.querySelector('.table-container');
    
    purchaseSection.insertBefore(searchInput, tableContainer);
    
    // Funcionalidad de filtrado
    searchInput.addEventListener('input', function() {
        const filter = this.value.toLowerCase();
        const rows = document.querySelectorAll('.purchase-table tbody tr');
        
        rows.forEach(row => {
            const text = row.textContent.toLowerCase();
            row.style.display = text.includes(filter) ? '' : 'none';
        });
    });
}

// Funciones utilitarias para formateo
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// Inicialización de funcionalidades adicionales
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar búsqueda en tabla
    // initTableSearch(); // Descomentар para habilitar búsqueda
    
    // Agregar tooltips a los indicadores de estado
    const statusIndicators = document.querySelectorAll('.status-indicator');
    statusIndicators.forEach(indicator => {
        let statusText = '';
        if (indicator.classList.contains('green')) {
            statusText = 'Proyecto en buen estado - Presupuesto bajo control';
        } else if (indicator.classList.contains('yellow')) {
            statusText = 'Precaución - Revisar gastos del proyecto';
        } else if (indicator.classList.contains('red')) {
            statusText = 'Alerta - Presupuesto cerca del límite';
        }
        
        indicator.title = statusText;
    });
    
    // Agregar efecto de hover a las filas de la tabla
    const tableRows = document.querySelectorAll('.purchase-table tbody tr');
    tableRows.forEach(row => {
        row.addEventListener('mouseenter', function() {
            this.style.transform = 'scale(1.01)';
            this.style.transition = 'transform 0.2s ease';
        });
        
        row.addEventListener('mouseleave', function() {
            this.style.transform = 'scale(1)';
        });
    });
});

// Función para simular notificaciones (para demo)
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 90px;
        right: 20px;
        background: ${type === 'success' ? 'var(--success-color)' : 'var(--primary-color)'};
        color: white;
        padding: 12px 20px;
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-lg);
        z-index: 3000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar notificación
    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Ocultar notificación
    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Exportar funciones para uso global
window.openModal = openModal;
window.closeModal = closeModal;