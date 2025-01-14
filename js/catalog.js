class Catalog {
    constructor() {
        this.products = [];
        this.categories = new Set();
        this.currentPage = 1;
        this.itemsPerPage = 12;
        this.filters = {
            categories: new Set(),
            priceFrom: null,
            priceTo: null,
            discount: false
        };
        this.sortType = 'price_asc';

        this.productsGrid = document.getElementById('products-grid');
        this.loadMoreBtn = document.getElementById('load-more');
        this.filtersForm = document.getElementById('filters-form');
        this.sortSelect = document.getElementById('sort-select');
        
        this.init();
    }

    async init() {
        await this.loadProducts();
        this.setupEventListeners();
        this.renderCategories();
        this.renderProducts();
    }

    setupEventListeners() {
        // Обработчик формы фильтров
        this.filtersForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFilterSubmit();
        });

        // Обработчик сортировки
        this.sortSelect.addEventListener('change', () => {
            this.sortType = this.sortSelect.value;
            this.currentPage = 1;
            this.renderProducts();
        });

        this.loadMoreBtn.addEventListener('click', () => {
            this.currentPage++;
            this.renderProducts(true);
        });
    }

    async loadProducts() {
        try {
            const products = await api.get('/goods');
            this.products = products;
            
            //уникальные категории
            products.forEach(product => {
                this.categories.add(product.main_category);
            });
        } catch (error) {
            console.error('Ошибка при загрузке товаров:', error);
        }
    }

    renderCategories() {
        const categoriesList = document.getElementById('categories-list');
        categoriesList.innerHTML = Array.from(this.categories)
            .map(category => `
                <label class="checkbox-label">
                    <input type="checkbox" name="category" value="${category}">
                    ${category}
                </label>
            `).join('');
    }

    handleFilterSubmit() {
        // Получение выбранных категорий
        const selectedCategories = Array.from(this.filtersForm.querySelectorAll('input[name="category"]:checked'))
            .map(input => input.value);
        this.filters.categories = new Set(selectedCategories);

        // Получение ценового диапазона
        const priceFrom = this.filtersForm.querySelector('input[name="price_from"]').value;
        const priceTo = this.filtersForm.querySelector('input[name="price_to"]').value;
        
        this.filters.priceFrom = priceFrom ? Number(priceFrom) : null;
        this.filters.priceTo = priceTo ? Number(priceTo) : null;

        // Получение статуса фильтра по скидкам
        this.filters.discount = this.filtersForm.querySelector('input[name="discount"]').checked;

        //Сброс и обновление
        this.currentPage = 1;
        this.renderProducts();
    }

    filterProducts() {
        return this.products.filter(product => {
            // Фильтрация по категориям
            if (this.filters.categories.size > 0 && !this.filters.categories.has(product.main_category)) {
                return false;
            }

            //Определение актуальной цены
            const price = product.discount_price || product.actual_price;

            // Фильтрация по цене
            if (this.filters.priceFrom !== null && price < this.filters.priceFrom) {
                return false;
            }
            if (this.filters.priceTo !== null && price > this.filters.priceTo) {
                return false;
            }

            // Фильтрация по наличию скидки
            if (this.filters.discount && !product.discount_price) {
                return false;
            }

            return true;
        });
    }

    sortProducts(products) {
        return [...products].sort((a, b) => {
            const priceA = a.discount_price || a.actual_price;
            const priceB = b.discount_price || b.actual_price;

            switch (this.sortType) {
                case 'price_asc':
                    return priceA - priceB;
                case 'price_desc':
                    return priceB - priceA;
                case 'rating':
                    return b.rating - a.rating;
                default:
                    return 0;
            }
        });
    }

    renderProducts(append = false) {
        const filteredProducts = this.filterProducts();
        const sortedProducts = this.sortProducts(filteredProducts);

        const startIndex = append ? (this.currentPage - 1) * this.itemsPerPage : 0;
        const endIndex = this.currentPage * this.itemsPerPage;
        const productsToShow = sortedProducts.slice(startIndex, endIndex);

        const productsHTML = productsToShow.map(product => this.createProductCard(product)).join('');

        if (append) {
            this.productsGrid.innerHTML += productsHTML;
        } else {
            this.productsGrid.innerHTML = productsHTML;
        }

        this.loadMoreBtn.style.display = 
            endIndex < filteredProducts.length ? 'block' : 'none';
    }

    createProductCard(product) {
        const price = product.discount_price || product.actual_price;
        const oldPrice = product.discount_price ? `<span class="product-card__old-price">${product.actual_price} ₽</span>` : '';
        
        return `
            <div class="product-card">
                <img src="${product.image_url}" alt="${product.name}">
                <h3 class="product-card__title" title="${product.name}">
                    ${product.name}
                </h3>
                <div class="product-card__rating">
                    ${'★'.repeat(Math.round(product.rating))}${'☆'.repeat(5 - Math.round(product.rating))}
                    <span>${product.rating}</span>
                </div>
                <div class="product-card__price">
                    <span class="product-card__current-price">${price} ₽</span>
                    ${oldPrice}
                </div>
                <button class="button button--primary" onclick="catalog.addToCart(${product.id})">
                    Добавить в корзину
                </button>
            </div>
        `;
    }

    addToCart(productId) {
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        cart.push(productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        
        this.showNotification('Товар добавлен в корзину', 'success');
        
        updateCartCounter();
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.textContent = message;
        document.getElementById('notifications').appendChild(notification);
        
        setTimeout(() => notification.remove(), 5000);
    }
}

function updateCartCounter() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartCount = document.querySelector('.cart-count');
    if (cartCount) {
        const count = cart.length;
        cartCount.innerHTML = `🛒 Корзина ${count > 0 ? `(${count})` : ''}`;
    }
}

document.addEventListener('DOMContentLoaded', updateCartCounter);

const catalog = new Catalog(); 