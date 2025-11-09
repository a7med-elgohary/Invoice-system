// DOM Elements
const form = document.getElementById('order-form');
const addProductBtn = document.getElementById('add-product');
const productsContainer = document.getElementById('products-container');
const ordersList = document.getElementById('orders-list');
const previewOrderBtn = document.getElementById('preview-order');
const printOrderBtn = document.getElementById('print-order');
const printAllOrdersBtn = document.getElementById('print-all-orders');
const navLinks = document.querySelectorAll('.nav-link');
const pageSections = document.querySelectorAll('.page-section');
const settingsForm = document.getElementById('settings-form');

// Preview modal elements
let previewModal = null;
let previewContent = null;

// Initialize DataTable
// $(document).ready(function() {
//     $('#orders-table').DataTable({
//         language: {
//             url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/ar.json'
//         },
//         order: [[0, 'desc']]
//     });
// });

// Application State
let orders = JSON.parse(localStorage.getItem('orders')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    companyName: 'شركتي',
    companyLogo: '',
    companyContact: 'هاتف: 0123456789\nالبريد الإلكتروني: info@example.com'
};

// Initialize the application
function init() {
    loadSettings();
    renderOrdersTable();
    setupEventListeners();
    showPage('add-order');
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('order-date').value = today;
    
    // Initialize invoice design settings
    initInvoiceDesign();
}

// Set up event listeners
function setupEventListeners() {
    // Navigation
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = link.getAttribute('data-page');
            showPage(page);
        });
    });
    
    // Preview order button
    previewOrderBtn.addEventListener('click', previewOrder);

    // Add product row
    addProductBtn.addEventListener('click', addProductRow);

    // Remove product row (delegated event)
    productsContainer.addEventListener('click', (e) => {
        if (e.target.closest('.remove-product')) {
            if (document.querySelectorAll('.product-item').length > 1) {
                e.target.closest('.product-item').remove();
                calculateTotals();
            } else {
                alert('يجب أن تحتوي الفاتورة على منتج واحد على الأقل');
            }
        }
    });

    // Calculate totals when quantity or price changes (delegated event)
    productsContainer.addEventListener('input', (e) => {
        if (e.target.classList.contains('product-quantity') || 
            e.target.classList.contains('product-price')) {
            calculateProductTotal(e.target.closest('.product-item'));
            calculateTotals();
        }
    });

    // Form submission
    form.addEventListener('submit', handleFormSubmit);

    // Print order
    printOrderBtn.addEventListener('click', () => printOrder());

    // Print all orders
    printAllOrdersBtn.addEventListener('click', printAllOrders);

    // Settings form submission
    settingsForm.addEventListener('submit', saveSettings);
}

// Show a specific page and hide others
function showPage(pageId) {
    // Update active nav link
    navLinks.forEach(link => {
        if (link.getAttribute('data-page') === pageId) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });

    // Show the selected page
    pageSections.forEach(section => {
        if (section.id === pageId) {
            section.classList.remove('hidden');
        } else {
            section.classList.add('hidden');
        }
    });

    // If showing orders page, refresh the table
    if (pageId === 'all-orders') {
        renderOrdersTable();
    }
    
    // If showing invoice designer, initialize it
    if (pageId === 'invoice-designer') {
        // The invoice-designer.js will handle its own initialization
        // when the DOM is loaded
    }
}

// Add a new product row
function addProductRow() {
    const productHtml = `
        <div class="product-item grid grid-cols-12 gap-2 mb-2 items-end">
            <div class="col-span-5">
                <input type="text" class="w-full p-2 border rounded product-name" required>
            </div>
            <div class="col-span-2">
                <input type="number" min="1" value="1" class="w-full p-2 border rounded product-quantity" required>
            </div>
            <div class="col-span-2">
                <input type="number" min="0" step="0.01" class="w-full p-2 border rounded product-price" required>
            </div>
            <div class="col-span-2">
                <input type="text" class="w-full p-2 border rounded product-total" readonly>
            </div>
            <div class="col-span-1">
                <button type="button" class="remove-product bg-red-500 text-white p-2 rounded hover:bg-red-600">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `;
    
    productsContainer.insertAdjacentHTML('beforeend', productHtml);
}

// Calculate total for a single product
function calculateProductTotal(productRow) {
    const quantity = parseFloat(productRow.querySelector('.product-quantity').value) || 0;
    const price = parseFloat(productRow.querySelector('.product-price').value) || 0;
    const total = quantity * price;
    productRow.querySelector('.product-total').value = total.toFixed(2);
    return total;
}

// Calculate totals for all products
function calculateTotals() {
    let subtotal = 0;
    document.querySelectorAll('.product-item').forEach(row => {
        subtotal += calculateProductTotal(row);
    });
    
    return {
        subtotal: subtotal,
        total: subtotal // Can be extended with tax, discount, etc.
    };
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Get form data
    const orderData = {
        id: Date.now(),
        date: document.getElementById('order-date').value || new Date().toISOString().split('T')[0],
        status: 'قيد الانتظار', // Default status
        sender: {
            name: document.getElementById('sender-name').value,
            phone: document.getElementById('sender-phone').value,
            address: document.getElementById('sender-address').value
        },
        receiver: {
            name: document.getElementById('receiver-name').value,
            phone: document.getElementById('receiver-phone').value,
            address: document.getElementById('receiver-address').value
        },
        products: [],
        notes: document.getElementById('notes').value,
        createdAt: new Date().toISOString()
    };
    
    // Get products
    document.querySelectorAll('.product-item').forEach(row => {
        orderData.products.push({
            name: row.querySelector('.product-name').value,
            quantity: parseFloat(row.querySelector('.product-quantity').value),
            price: parseFloat(row.querySelector('.product-price').value),
            total: parseFloat(row.querySelector('.product-total').value)
        });
    });
    
    // Calculate totals
    const totals = calculateTotals();
    orderData.subtotal = totals.subtotal;
    orderData.total = totals.total;
    
    // Add to orders array
    orders.unshift(orderData);
    
    // Save to localStorage
    localStorage.setItem('orders', JSON.stringify(orders));
    
    // Reset form
    form.reset();
    
    // Reset products (keep one empty row)
    productsContainer.innerHTML = '';
    addProductRow();
    
    // Show success message
    alert('تم حفظ الأوردر بنجاح!');
    
    // Show the orders page
    showPage('all-orders');
}

// Render orders in the table
function renderOrdersTable() {
    const tbody = document.querySelector('#orders-table tbody');
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="8" class="text-center py-4">لا توجد أوردرات مسجلة</td>`;
        tbody.appendChild(tr);
        return;
    }
    
    orders.forEach((order, index) => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-id', order.id);
        
        // Count total products and calculate total amount
        const totalProducts = order.products.reduce((sum, product) => sum + product.quantity, 0);
        const totalAmount = order.products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
        
        tr.innerHTML = `
            <td class="border p-2">${index + 1}</td>
            <td class="border p-2">${formatDate(order.date)}</td>
            <td class="border p-2">${order.sender.name}</td>
            <td class="border p-2">${order.receiver.name}</td>
            <td class="border p-2">${totalProducts} منتج</td>
            <td class="border p-2">${totalAmount.toFixed(2)} ج.م</td>
            <td class="border p-2">
                <span class="status-badge ${order.status === 'تم التسليم' ? 'status-delivered' : 'status-pending'}">
                    ${order.status}
                </span>
            </td>
            <td class="border p-2">
                <div class="action-buttons">
                    <button onclick="printOrder('${order.id}')" class="action-button view" title="طباعة">
                        <i class="fas fa-print"></i>
                    </button>
                    <button onclick="editOrder('${order.id}')" class="action-button edit" title="تعديل">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteOrder('${order.id}')" class="action-button delete" title="حذف">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    // Reinitialize DataTable
    if ($.fn.DataTable.isDataTable('#orders-table')) {
        $('#orders-table').DataTable().destroy();
    }
    
    $('#orders-table').DataTable({
        language: {
            url: '//cdn.datatables.net/plug-ins/1.11.5/i18n/ar.json'
        },
        order: [[0, 'desc']]
    });
}

// Show preview of the order
function previewOrder() {
    if (!validateForm(true)) return;
    
    // Generate invoice HTML
    const invoiceHtml = generateInvoiceHtml(getCurrentOrderData());
    
    // Create or update preview modal
    if (!previewModal) {
        createPreviewModal();
    }
    
    // Update preview content
    previewContent.innerHTML = invoiceHtml;
    
    // Show the modal
    previewModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

// Create preview modal
function createPreviewModal() {
    previewModal = document.createElement('div');
    previewModal.className = 'fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center p-4 hidden';
    previewModal.innerHTML = `
        <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 class="text-xl font-bold">معاينة الفاتورة</h3>
                <div class="space-x-2">
                    <button id="print-from-preview" class="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
                        <i class="fas fa-print ml-1"></i> طباعة
                    </button>
                    <button id="close-preview" class="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600">
                        <i class="fas fa-times ml-1"></i> إغلاق
                    </button>
                </div>
            </div>
            <div class="p-6 overflow-auto flex-1" id="preview-content"></div>
        </div>
    `;
    
    document.body.appendChild(previewModal);
    previewContent = document.getElementById('preview-content');
    
    // Add event listeners for modal buttons
    document.getElementById('close-preview').addEventListener('click', () => {
        previewModal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    });
    
    document.getElementById('print-from-preview').addEventListener('click', () => {
        const printWindow = window.open('', '_blank');
        printWindow.document.write(`
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>طباعة الفاتورة</title>
                <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
                <style>
                    @page { size: A4; margin: 1cm; }
                    body { font-family: Arial, sans-serif; }
                </style>
            </head>
            <body class="bg-white p-4">
                ${previewContent.innerHTML}
                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                            window.onafterprint = function() {
                                window.close();
                            };
                        }, 500);
                    };
                <\/script>
            </body>
            </html>
        `);
        printWindow.document.close();
    });
}

// Get current order data from form
function getCurrentOrderData() {
    const orderData = {
        id: 'PREVIEW-' + Date.now(),
        date: document.getElementById('order-date').value || new Date().toISOString().split('T')[0],
        status: 'معاينة',
        sender: {
            name: document.getElementById('sender-name').value,
            phone: document.getElementById('sender-phone').value,
            address: document.getElementById('sender-address').value
        },
        receiver: {
            name: document.getElementById('receiver-name').value,
            phone: document.getElementById('receiver-phone').value,
            address: document.getElementById('receiver-address').value
        },
        products: [],
        notes: document.getElementById('notes').value || 'هذه معاينة للفاتورة - لم يتم حفظها بعد',
        createdAt: new Date().toISOString()
    };
    
    // Get products from form
    document.querySelectorAll('.product-item').forEach(row => {
        orderData.products.push({
            name: row.querySelector('.product-name').value,
            quantity: parseFloat(row.querySelector('.product-quantity').value) || 0,
            price: parseFloat(row.querySelector('.product-price').value) || 0
        });
    });
    
    return orderData;
}

// Apply design settings to invoice
function applyInvoiceDesign(invoiceHtml) {
    const settings = JSON.parse(localStorage.getItem('invoiceSettings') || '{}');
    
    // If no design settings, return original HTML
    if (!settings.design) return invoiceHtml;
    
    const design = settings.design;
    
    // Create a temporary div to parse the HTML
    const temp = document.createElement('div');
    temp.innerHTML = invoiceHtml;
    
    // Apply header styles
    const header = temp.querySelector('.invoice-header');
    if (header) {
        header.style.backgroundColor = design.headerColor || '#2563eb';
        header.style.color = design.headerTextColor || '#ffffff';
    }
    
    // Apply font settings
    const container = temp.querySelector('.invoice-container');
    if (container) {
        container.className = `invoice-container ${design.fontSize || 'text-base'} ${design.fontFamily || 'font-sans'}`;
    }
    
    // Apply footer text
    const footer = temp.querySelector('.invoice-footer');
    if (footer && design.footerText) {
        footer.textContent = design.footerText;
    }
    
    // Apply watermark if enabled
    if (design.showWatermark) {
        const mainContent = temp.querySelector('.invoice-content');
        if (mainContent) {
            mainContent.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ctext x=\'50%25\' y=\'50%25\' font-family=\'Arial\' font-size=\'20\' text-anchor=\'middle\' dominant-baseline=\'middle\' fill-opacity=\'0.1\' fill=\'%23000\' transform=\'rotate(-45, 50, 50)\'>مسودة</text%3E%3C/svg%3E")';
            mainContent.style.backgroundRepeat = 'repeat';
            mainContent.style.backgroundSize = '200px 200px';
        }
    }
    
    return temp.innerHTML;
}

// Generate invoice HTML
function generateInvoiceHtml(order) {
    // Calculate totals
    const subtotal = order.products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    const total = subtotal; // Can add tax, discount, etc.
    
    // Generate products HTML
    let productsHtml = '';
    order.products.forEach((product, index) => {
        productsHtml += `
            <tr>
                <td class="border p-2 text-center">${index + 1}</td>
                <td class="border p-2">${product.name}</td>
                <td class="border p-2 text-center">${product.quantity}</td>
                <td class="border p-2 text-left">${product.price.toFixed(2)} ج.م</td>
                <td class="border p-2 text-left">${(product.quantity * product.price).toFixed(2)} ج.م</td>
            </tr>
        `;
    });
    
    // Generate the invoice HTML
    return `
        <div class="invoice-container">
            <div class="invoice-header flex justify-between items-center p-6">
                <div class="text-right">
                    <h1 class="text-2xl font-bold">${settings.companyName || 'شركتي'}</h1>
                    <p>${(settings.companyContact || '').replace(/\n/g, '<br>')}</p>
                </div>
                ${settings.companyLogo ? `
                    <div class="w-32">
                        <img src="${settings.companyLogo}" alt="شعار الشركة" class="w-full h-auto">
                    </div>
                ` : ''}
            </div>
            
            <div class="mb-8">
                <h2 class="text-xl font-bold mb-4 text-center">فاتورة مبيعات</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <div class="border p-4 rounded">
                        <h3 class="font-bold mb-2 border-b pb-1">المرسل</h3>
                        <p>${order.sender.name}</p>
                        <p>${order.sender.phone}</p>
                        <p>${order.sender.address}</p>
                    </div>
                    <div class="border p-4 rounded">
                        <h3 class="font-bold mb-2 border-b pb-1">المستلم</h3>
                        <p>${order.receiver.name}</p>
                        <p>${order.receiver.phone}</p>
                        <p>${order.receiver.address}</p>
                    </div>
                </div>
                
                <div class="mb-4">
                    <p><span class="font-bold">تاريخ الفاتورة:</span> ${formatDate(order.date)}</p>
                    <p><span class="font-bold">رقم الفاتورة:</span> ${order.id}</p>
                    <p class="text-red-500">${order.notes.includes('معاينة') ? '⚠️ هذه معاينة للفاتورة - لم يتم حفظها بعد' : ''}</p>
                </div>
                
                <table class="w-full border-collapse border mb-6">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border p-2 w-12">#</th>
                            <th class="border p-2 text-right">المنتج</th>
                            <th class="border p-2 w-20">الكمية</th>
                            <th class="border p-2 w-32 text-left">سعر الوحدة</th>
                            <th class="border p-2 w-32 text-left">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" class="border p-2 text-left font-bold">المجموع</td>
                            <td class="border p-2 text-left">${subtotal.toFixed(2)} ج.م</td>
                        </tr>
                        <tr>
                            <td colspan="4" class="border p-2 text-left font-bold">الإجمالي النهائي</td>
                            <td class="border p-2 text-left font-bold">${total.toFixed(2)} ج.م</td>
                        </tr>
                    </tfoot>
                </table>
                
                ${order.notes ? `
                    <div class="mt-6">
                        <h3 class="font-bold mb-2">ملاحظات</h3>
                        <p class="border p-3 rounded">${order.notes}</p>
                    </div>
                ` : ''}
                
                <div class="mt-12 pt-8 border-t flex justify-between">
                    <div class="text-center">
                        <p class="mb-1">توقيع المستلم</p>
                        <div class="h-16 border-t border-dashed w-48 mx-auto"></div>
                    </div>
                    <div class="text-center">
                        <p class="mb-1">توقيع المسؤول</p>
                        <div class="h-16 border-t border-dashed w-48 mx-auto"></div>
                    </div>
                </div>
                
                <div class="invoice-footer mt-8 text-center text-sm text-gray-500">
                    <p>شكراً لتعاملكم مع ${settings.companyName || 'شركتنا'}</p>
                    <p>${(settings.companyContact || '').split('\n')[0] || 'للاستفسار: 0123456789'}</p>
                </div>
            </div>
        </div>
    `;
}

// Print a single order
function printOrder(orderId = null) {
    let order;
    
    if (orderId) {
        // Find the order by ID
        order = orders.find(o => o.id.toString() === orderId.toString());
        if (!order) {
            alert('لم يتم العثور على الأوردر المطلوب');
            return;
        }
    } else {
        // Get order from form
        if (!validateForm()) return;
        
        order = {
            date: document.getElementById('order-date').value || new Date().toISOString().split('T')[0],
            sender: {
                name: document.getElementById('sender-name').value,
                phone: document.getElementById('sender-phone').value,
                address: document.getElementById('sender-address').value
            },
            receiver: {
                name: document.getElementById('receiver-name').value,
                phone: document.getElementById('receiver-phone').value,
                address: document.getElementById('receiver-address').value
            },
            products: [],
            notes: document.getElementById('notes').value
        };
        
        // Get products from form
        document.querySelectorAll('.product-item').forEach(row => {
            order.products.push({
                name: row.querySelector('.product-name').value,
                quantity: parseFloat(row.querySelector('.product-quantity').value),
                price: parseFloat(row.querySelector('.product-price').value)
            });
        });
    }
    
    // Calculate totals
    const subtotal = order.products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
    const total = subtotal; // Can add tax, discount, etc.
    
    // Generate invoice HTML
    let productsHtml = '';
    order.products.forEach((product, index) => {
        productsHtml += `
            <tr>
                <td class="border p-2 text-center">${index + 1}</td>
                <td class="border p-2">${product.name}</td>
                <td class="border p-2 text-center">${product.quantity}</td>
                <td class="border p-2 text-left">${product.price.toFixed(2)} ج.م</td>
                <td class="border p-2 text-left">${(product.quantity * product.price).toFixed(2)} ج.م</td>
            </tr>
        `;
    });
    
    const invoiceHtml = `
        <div id="invoice-print" class="invoice-container bg-white p-8 max-w-4xl mx-auto">
            <div class="flex justify-between items-center mb-8 border-b pb-4">
                <div class="text-right">
                    <h1 class="text-2xl font-bold">${settings.companyName}</h1>
                    <p class="text-gray-600">${settings.companyContact.replace(/\n/g, '<br>')}</p>
                </div>
                ${settings.companyLogo ? `
                    <div class="w-32">
                        <img src="${settings.companyLogo}" alt="شعار الشركة" class="w-full h-auto">
                    </div>
                ` : ''}
            </div>
            
            <div class="mb-8">
                <h2 class="text-xl font-bold mb-4 text-center">فاتورة مبيعات</h2>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                    <div class="border p-4 rounded">
                        <h3 class="font-bold mb-2 border-b pb-1">المرسل</h3>
                        <p>${order.sender.name}</p>
                        <p>${order.sender.phone}</p>
                        <p>${order.sender.address}</p>
                    </div>
                    <div class="border p-4 rounded">
                        <h3 class="font-bold mb-2 border-b pb-1">المستلم</h3>
                        <p>${order.receiver.name}</p>
                        <p>${order.receiver.phone}</p>
                        <p>${order.receiver.address}</p>
                    </div>
                </div>
                
                <div class="mb-4">
                    <p><span class="font-bold">تاريخ الفاتورة:</span> ${formatDate(order.date)}</p>
                    <p><span class="font-bold">رقم الفاتورة:</span> #${orderId || 'NEW'}</p>
                </div>
                
                <table class="w-full border-collapse border mb-6">
                    <thead>
                        <tr class="bg-gray-100">
                            <th class="border p-2 w-12">#</th>
                            <th class="border p-2 text-right">المنتج</th>
                            <th class="border p-2 w-20">الكمية</th>
                            <th class="border p-2 w-32 text-left">سعر الوحدة</th>
                            <th class="border p-2 w-32 text-left">الإجمالي</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${productsHtml}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="4" class="border p-2 text-left font-bold">المجموع</td>
                            <td class="border p-2 text-left">${subtotal.toFixed(2)} ج.م</td>
                        </tr>
                        <tr>
                            <td colspan="4" class="border p-2 text-left font-bold">الإجمالي النهائي</td>
                            <td class="border p-2 text-left font-bold">${total.toFixed(2)} ج.م</td>
                        </tr>
                    </tfoot>
                </table>
                
                ${order.notes ? `
                    <div class="mt-6">
                        <h3 class="font-bold mb-2">ملاحظات</h3>
                        <p class="border p-3 rounded">${order.notes}</p>
                    </div>
                ` : ''}
                
                <div class="mt-12 pt-8 border-t flex justify-between">
                    <div class="text-center">
                        <p class="mb-1">توقيع المستلم</p>
                        <div class="h-16 border-t border-dashed w-48 mx-auto"></div>
                    </div>
                    <div class="text-center">
                        <p class="mb-1">توقيع المسؤول</p>
                        <div class="h-16 border-t border-dashed w-48 mx-auto"></div>
                    </div>
                </div>
                
                <div class="mt-8 text-center text-sm text-gray-500">
                    <p>شكراً لتعاملكم مع ${settings.companyName}</p>
                    <p>للاستفسار: ${settings.companyContact.split('\n')[0]}</p>
                </div>
            </div>
        </div>
        
        <style>
            @media print {
                @page {
                    size: A4;
                    margin: 1cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    direction: rtl;
                }
                .invoice-container {
                    width: 100%;
                    max-width: 100%;
                    padding: 0;
                    margin: 0;
                }
                .no-print {
                    display: none !important;
                }
                .page-break {
                    page-break-before: always;
                }
            }
        </style>
    `;
    
    // Open print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>طباعة الفاتورة</title>
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
            <style>
                body { font-family: Arial, sans-serif; }
                @page { size: A4; margin: 1cm; }
                .page-break { page-break-before: always; }
            </style>
        </head>
        <body class="bg-gray-100 p-4">
            <div class="no-print mb-4">
                <button onclick="window.print()" class="bg-blue-500 text-white px-4 py-2 rounded">
                    <i class="fas fa-print ml-1"></i> طباعة
                </button>
                <button onclick="window.close()" class="bg-gray-500 text-white px-4 py-2 rounded mr-2">
                    <i class="fas fa-times ml-1"></i> إغلاق
                </button>
            </div>
            ${invoiceHtml}
            <script>
                // Auto-print when the window loads
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
                
                // Close the window after printing
                window.onafterprint = function() {
                    // window.close();
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Print all orders
function printAllOrders() {
    if (orders.length === 0) {
        alert('لا توجد أوردرات للطباعة');
        return;
    }
    
    let allInvoicesHtml = '';
    
    orders.forEach((order, index) => {
        // Generate invoice HTML for each order (similar to printOrder function)
        const subtotal = order.products.reduce((sum, product) => sum + (product.quantity * product.price), 0);
        const total = subtotal;
        
        let productsHtml = '';
        order.products.forEach((product, idx) => {
            productsHtml += `
                <tr>
                    <td class="border p-2 text-center">${idx + 1}</td>
                    <td class="border p-2">${product.name}</td>
                    <td class="border p-2 text-center">${product.quantity}</td>
                    <td class="border p-2 text-left">${product.price.toFixed(2)} ج.م</td>
                    <td class="border p-2 text-left">${(product.quantity * product.price).toFixed(2)} ج.م</td>
                </tr>
            `;
        });
        
        allInvoicesHtml += `
            <div class="invoice-container bg-white p-8 max-w-4xl mx-auto mb-8 border rounded-lg shadow">
                <div class="flex justify-between items-center mb-6 border-b pb-4">
                    <div class="text-right">
                        <h1 class="text-2xl font-bold">${settings.companyName}</h1>
                        <p class="text-gray-600">${settings.companyContact.replace(/\n/g, '<br>')}</p>
                    </div>
                    ${settings.companyLogo ? `
                        <div class="w-24">
                            <img src="${settings.companyLogo}" alt="شعار الشركة" class="w-full h-auto">
                        </div>
                    ` : ''}
                </div>
                
                <div class="mb-6">
                    <h2 class="text-xl font-bold mb-4 text-center">فاتورة مبيعات #${order.id}</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div class="border p-3 rounded">
                            <h3 class="font-bold mb-2 border-b pb-1">المرسل</h3>
                            <p>${order.sender.name}</p>
                            <p>${order.sender.phone}</p>
                            <p>${order.sender.address}</p>
                        </div>
                        <div class="border p-3 rounded">
                            <h3 class="font-bold mb-2 border-b pb-1">المستلم</h3>
                            <p>${order.receiver.name}</p>
                            <p>${order.receiver.phone}</p>
                            <p>${order.receiver.address}</p>
                        </div>
                    </div>
                    
                    <div class="mb-4 text-sm">
                        <p><span class="font-bold">تاريخ الفاتورة:</span> ${formatDate(order.date)}</p>
                        <p><span class="font-bold">حالة الطلب:</span> 
                            <span class="${order.status === 'تم التسليم' ? 'text-green-600' : 'text-yellow-600'}">
                                ${order.status}
                            </span>
                        </p>
                    </div>
                    
                    <table class="w-full border-collapse border mb-4 text-sm">
                        <thead>
                            <tr class="bg-gray-100">
                                <th class="border p-1 w-8">#</th>
                                <th class="border p-1 text-right">المنتج</th>
                                <th class="border p-1 w-16">الكمية</th>
                                <th class="border p-1 w-24 text-left">سعر الوحدة</th>
                                <th class="border p-1 w-24 text-left">الإجمالي</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${productsHtml}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="4" class="border p-1 text-left font-bold">المجموع</td>
                                <td class="border p-1 text-left">${subtotal.toFixed(2)} ج.م</td>
                            </tr>
                            <tr>
                                <td colspan="4" class="border p-1 text-left font-bold">الإجمالي النهائي</td>
                                <td class="border p-1 text-left font-bold">${total.toFixed(2)} ج.م</td>
                            </tr>
                        </tfoot>
                    </table>
                    
                    ${order.notes ? `
                        <div class="mt-4 text-sm">
                            <h3 class="font-bold mb-1">ملاحظات</h3>
                            <p class="border p-2 rounded bg-gray-50">${order.notes}</p>
                        </div>
                    ` : ''}
                    
                    <div class="mt-8 pt-4 border-t flex justify-between text-xs">
                        <div class="text-center">
                            <p class="mb-1">توقيع المستلم</p>
                            <div class="h-12 border-t border-dashed w-32 mx-auto"></div>
                        </div>
                        <div class="text-center">
                            <p class="mb-1">توقيع المسؤول</p>
                            <div class="h-12 border-t border-dashed w-32 mx-auto"></div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${index < orders.length - 1 ? '<div class="page-break"></div>' : ''}
        `;
    });
    
    // Open print window with all invoices
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl" lang="ar">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
            <style>
                @page {
                    size: A4;
                    margin: 1cm;
                }
                body {
                    font-family: Arial, sans-serif;
                    direction: rtl;
                    background-color: #f3f4f6;
                    padding: 20px;
                }
                .invoice-container {
                    page-break-inside: avoid;
                    margin-bottom: 20px;
                }
                .page-break {
                    page-break-before: always;
                }
                @media print {
                    body {
                        padding: 0;
                        background: white;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .invoice-container {
                        margin: 0;
                        padding: 0;
                        box-shadow: none;
                        border: none;
                    }
                }
            </style>
        </head>
        <body>
            <div class="no-print mb-4 text-center">
                <button onclick="window.print()" class="bg-blue-500 text-white px-4 py-2 rounded">
                    <i class="fas fa-print ml-1"></i> طباعة كل الأوردرات
                </button>
                <button onclick="window.close()" class="bg-gray-500 text-white px-4 py-2 rounded mr-2">
                    <i class="fas fa-times ml-1"></i> إغلاق
                </button>
                <p class="mt-2 text-sm text-gray-600">عدد الأوردرات: ${orders.length}</p>
            </div>
            
            ${allInvoicesHtml}
            
            <div class="no-print mt-8 text-center text-sm text-gray-500">
                <p>${settings.companyName} - ${new Date().getFullYear()}</p>
            </div>
            
            <script>
                // Auto-print when the window loads
                window.onload = function() {
                    setTimeout(function() {
                        window.print();
                    }, 500);
                };
                
                // Close the window after printing
                window.onafterprint = function() {
                    // window.close();
                };
            <\/script>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// Edit an existing order
function editOrder(orderId) {
    const order = orders.find(o => o.id.toString() === orderId.toString());
    if (!order) {
        alert('لم يتم العثور على الأوردر المطلوب');
        return;
    }
    
    // Fill the form with order data
    document.getElementById('order-date').value = order.date;
    
    // Sender info
    document.getElementById('sender-name').value = order.sender.name;
    document.getElementById('sender-phone').value = order.sender.phone;
    document.getElementById('sender-address').value = order.sender.address;
    
    // Receiver info
    document.getElementById('receiver-name').value = order.receiver.name;
    document.getElementById('receiver-phone').value = order.receiver.phone;
    document.getElementById('receiver-address').value = order.receiver.address;
    
    // Notes
    document.getElementById('notes').value = order.notes || '';
    
    // Clear existing products
    productsContainer.innerHTML = '';
    
    // Add products
    order.products.forEach((product, index) => {
        if (index > 0) addProductRow();
        
        const productRows = document.querySelectorAll('.product-item');
        const currentRow = productRows[productRows.length - 1];
        
        currentRow.querySelector('.product-name').value = product.name;
        currentRow.querySelector('.product-quantity').value = product.quantity;
        currentRow.querySelector('.product-price').value = product.price;
        calculateProductTotal(currentRow);
    });
    
    // Show the add order page
    showPage('add-order');
    
    // Scroll to top
    window.scrollTo(0, 0);
    
    // Show a message
    alert('يمكنك الآن تعديل الأوردر. لا تنسَ حفظ التغييرات بعد الانتهاء.');
}

// Delete an order
function deleteOrder(orderId) {
    if (confirm('هل أنت متأكد من حذف هذا الأوردر؟ لا يمكن التراجع عن هذه العملية.')) {
        orders = orders.filter(order => order.id.toString() !== orderId.toString());
        localStorage.setItem('orders', JSON.stringify(orders));
        renderOrdersTable();
        alert('تم حذف الأوردر بنجاح');
    }
}

// Validate form before submission
function validateForm(showErrors = true) {
    // Check if at least one product is added
    const productRows = document.querySelectorAll('.product-item');
    if (productRows.length === 0) {
        if (showErrors) alert('الرجاء إضافة منتج واحد على الأقل');
        return false;
    }
    
    // Check if all required fields are filled
    const requiredFields = [
        'sender-name', 'sender-phone', 'sender-address',
        'receiver-name', 'receiver-phone', 'receiver-address'
    ];
    
    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (!field.value.trim()) {
            if (showErrors) {
                alert('الرجاء ملء جميع الحقول المطلوبة');
                field.focus();
            }
            return false;
        }
    }
    
    // Validate products
    let hasValidProducts = false;
    document.querySelectorAll('.product-item').forEach(row => {
        const name = row.querySelector('.product-name').value.trim();
        const quantity = parseFloat(row.querySelector('.product-quantity').value) || 0;
        const price = parseFloat(row.querySelector('.product-price').value) || 0;
        
        if (name && (quantity > 0) && (price >= 0)) {
            hasValidProducts = true;
        }
    });
    
    if (!hasValidProducts) {
        if (showErrors) alert('الرجاء إدخال بيانات المنتجات بشكل صحيح');
        return false;
    }
    
    return true;
}

// Format date to YYYY-MM-DD
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // Return original if invalid date
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    return `${year}-${month}-${day}`;
}

// Initialize invoice design settings
function initInvoiceDesign() {
    // Color picker sync
    const colorInputs = ['header-color', 'header-text-color'];
    colorInputs.forEach(id => {
        const picker = document.getElementById(id);
        const text = document.getElementById(`${id}-value`);
        
        if (picker && text) {
            // Update text input when color picker changes
            picker.addEventListener('input', (e) => {
                text.value = e.target.value;
                updateInvoicePreview();
            });
            
            // Update color picker when text input changes
            text.addEventListener('input', (e) => {
                if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                    picker.value = e.target.value;
                    updateInvoicePreview();
                }
            });
        }
    });
    
    // Add event listeners for other design controls
    const designControls = ['font-size', 'font-family', 'invoice-footer', 'show-watermark'];
    designControls.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', updateInvoicePreview);
            element.addEventListener('input', updateInvoicePreview);
        }
    });
    
    // Initial preview update
    updateInvoicePreview();
}

// Update the invoice preview with current settings
function updateInvoicePreview() {
    // Update company info
    const companyName = document.getElementById('company-name').value || 'اسم الشركة';
    const companyContact = document.getElementById('company-contact').value || 'معلومات الاتصال';
    
    document.getElementById('preview-company-name').textContent = companyName;
    document.getElementById('preview-company-contact').textContent = companyContact;
    
    // Update header colors
    const headerColor = document.getElementById('header-color').value;
    const headerTextColor = document.getElementById('header-text-color').value;
    const header = document.querySelector('#invoice-preview > div:first-child');
    if (header) {
        header.style.backgroundColor = headerColor;
        header.style.color = headerTextColor;
    }
    
    // Update font settings
    const fontSize = document.getElementById('font-size').value;
    const fontFamily = document.getElementById('font-family').value;
    const preview = document.getElementById('invoice-preview');
    
    // Reset all font classes
    ['text-sm', 'text-base', 'text-lg', 'text-xl'].forEach(cls => {
        preview.classList.remove(cls);
    });
    ['font-sans', 'font-serif', 'font-mono', 'font-tajawal'].forEach(cls => {
        preview.classList.remove(cls);
    });
    
    // Apply selected font classes
    preview.classList.add(fontSize, fontFamily);
    
    // Update footer text
    const footerText = document.getElementById('invoice-footer').value || 'شكراً لتعاملكم معنا';
    document.getElementById('preview-footer').textContent = footerText;
    
    // Update watermark
    const showWatermark = document.getElementById('show-watermark').checked;
    if (showWatermark) {
        preview.style.backgroundImage = 'url("data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Ctext x=\'50%25\' y=\'50%25\' font-family=\'Arial\' font-size=\'20\' text-anchor=\'middle\' dominant-baseline=\'middle\' fill-opacity=\'0.1\' fill=\'%23000\' transform=\'rotate(-45, 50, 50)\'>مسودة</text%3E%3C/svg%3E")';
        preview.style.backgroundRepeat = 'repeat';
        preview.style.backgroundSize = '200px 200px';
    } else {
        preview.style.backgroundImage = 'none';
    }
}

// Load settings from localStorage
function loadSettings() {
    const savedSettings = localStorage.getItem('invoiceSettings');
    if (savedSettings) {
        settings = JSON.parse(savedSettings);
        // Apply settings to form
        document.getElementById('company-name').value = settings.companyName || '';
        document.getElementById('company-logo').value = settings.companyLogo || '';
        document.getElementById('company-contact').value = settings.companyContact || '';
        
        // Apply design settings if they exist
        if (settings.design) {
            const design = settings.design;
            if (design.headerColor) {
                document.getElementById('header-color').value = design.headerColor;
                document.getElementById('header-color-value').value = design.headerColor;
            }
            if (design.headerTextColor) {
                document.getElementById('header-text-color').value = design.headerTextColor;
                document.getElementById('header-text-color-value').value = design.headerTextColor;
            }
            if (design.fontSize) document.getElementById('font-size').value = design.fontSize;
            if (design.fontFamily) document.getElementById('font-family').value = design.fontFamily;
            if (design.footerText) document.getElementById('invoice-footer').value = design.footerText;
            if (design.showWatermark) document.getElementById('show-watermark').checked = design.showWatermark;
        }
        
        // Update preview after loading settings
        setTimeout(updateInvoicePreview, 100);
    }
}

// Save settings to localStorage
function saveSettings(e) {
    e.preventDefault();
    
    settings = {
        companyName: document.getElementById('company-name').value,
        companyLogo: document.getElementById('company-logo').value,
        companyContact: document.getElementById('company-contact').value,
        design: {
            headerColor: document.getElementById('header-color').value,
            headerTextColor: document.getElementById('header-text-color').value,
            fontSize: document.getElementById('font-size').value,
            fontFamily: document.getElementById('font-family').value,
            footerText: document.getElementById('invoice-footer').value,
            showWatermark: document.getElementById('show-watermark').checked
        }
    };
    
    localStorage.setItem('invoiceSettings', JSON.stringify(settings));
    
    // Show success message
    const successMsg = document.createElement('div');
    successMsg.className = 'fixed bottom-4 left-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg';
    successMsg.textContent = 'تم حفظ الإعدادات بنجاح';
    document.body.appendChild(successMsg);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        successMsg.remove();
    }, 3000);
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);

// Make functions available globally for inline event handlers
window.printOrder = printOrder;
window.editOrder = editOrder;
window.deleteOrder = deleteOrder;
