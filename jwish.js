let state = {
  products: [],
  activeCategory: 'all',
  query: '',
  sort: 'featured'
};

function renderCategoryChips(categories) {
  const chips = document.getElementById('categoryChips');
  chips.innerHTML = '';
  const allChip = document.createElement('button');
  allChip.className = 'chip active';
  allChip.textContent = 'הכל';
  allChip.addEventListener('click', () => {
    state.activeCategory = 'all';
    updateActiveChips();
    renderProducts();
  });
  chips.appendChild(allChip);
  categories.forEach(cat => {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = cat.name;
    chip.addEventListener('click', () => {
      state.activeCategory = cat.slug;
      updateActiveChips();
      renderProducts();
    });
    chips.appendChild(chip);
  });
}

function updateActiveChips() {
  document.querySelectorAll('#categoryChips .chip').forEach(chip => {
    chip.classList.remove('active');
    if (chip.textContent === 'הכל' && state.activeCategory === 'all') chip.classList.add('active');
    else if (chip.textContent !== 'הכל' && chip.textContent === getCategoryName(state.activeCategory)) chip.classList.add('active');
  });
}

function getCategoryName(slug) {
  const cat = state.products.find(p => p.category === slug);
  return cat ? cat.category : '';
}

function bindUI() {
  document.getElementById('searchInput').addEventListener('input', e => {
    state.query = e.target.value.trim().toLowerCase();
    renderProducts();
  });
  document.getElementById('sortSelect').addEventListener('change', e => {
    state.sort = e.target.value;
    renderProducts();
  });
}
const cart = [];
const favorites = [];

function loadProducts() {
  fetch('products_jewish_home.json')
    .then(response => response.json())
    .then(data => {
      state.products = data.products1.filter(p => p.id);
      renderCategoryChips(data.products1.filter(p => p.slug));
      renderProducts();
      bindUI();
    });
}

function renderProducts() {
  let items = state.products;
  if (state.activeCategory !== 'all') {
    items = items.filter(p => p.category === state.activeCategory);
  }
  if (state.query) {
    items = items.filter(p => p.title.toLowerCase().includes(state.query));
  }
  if (state.sort === 'price-asc') {
    items = items.slice().sort((a, b) => a.price - b.price);
  } else if (state.sort === 'price-desc') {
    items = items.slice().sort((a, b) => b.price - a.price);
  } else if (state.sort === 'name-asc') {
    items = items.slice().sort((a, b) => a.title.localeCompare(b.title));
  } else if (state.sort === 'featured') {
    items = items.slice().sort((a, b) => (b.featured ? 1 : -1));
  }
  const container = document.querySelector('.grid-products');
  container.innerHTML = '';
  items.forEach(product => {
    const card = document.createElement('div');
    card.className = 'product-card';
    let item = cart.find(i => i.id === product.id);
    let qty = item ? item.quantity : 0;
    card.innerHTML = `
      <div class="card-media">
        <img src="${product.image}" alt="${product.title}" />
      </div>
      <div class="card-body">
        <h3 class="card-title">${product.title}</h3>
        <p class="card-meta">${product.description}</p>
        <span class="price">₪${product.price}</span>
        <div class="card-actions">
          <button class="icon-btn" onclick="addToCart('${product.id}')">🛒</button>
          <button class="icon-btn" onclick="addToFavorites('${product.id}')">❤️</button>
          <div class="quantity-controls" data-id="${product.id}">
            <button class="qty-btn minus">−</button>
            <span class="qty-display">${qty}</span>
            <button class="qty-btn plus">+</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
    // הפעלת אירועים לכפתורי +/− בכרטיס
    const minusBtn = card.querySelector('.qty-btn.minus');
    const plusBtn = card.querySelector('.qty-btn.plus');
    const qtyDisplay = card.querySelector('.qty-display');
    minusBtn.addEventListener('click', function () {
      let item = cart.find(i => i.id === product.id);
      if (item) {
        item.quantity--;
        if (item.quantity <= 0) {
          cart.splice(cart.indexOf(item), 1);
          qtyDisplay.textContent = 0;
        } else {
          qtyDisplay.textContent = item.quantity;
        }
        updateDisplay('cart', cart);
      }
    });
    plusBtn.addEventListener('click', function () {
      let item = cart.find(i => i.id === product.id);
      if (item) {
        item.quantity++;
        qtyDisplay.textContent = item.quantity;
      } else {
        cart.push({ ...product, quantity: 1 });
        qtyDisplay.textContent = 1;
      }
      updateDisplay('cart', cart);
    });
  });
}


function addToCart(productId) {
  fetch('products_jewish_home.json') // ← תיקון שם הקובץ
    .then(response => response.json())
    .then(data => {
      const product = data.products1.find(p => p.id === productId);
      if (product) {
        let item = cart.find(i => i.id === productId);
        if (item) {
          item.quantity++;
        } else {
          cart.push({ ...product, quantity: 1 });
        }
        updateDisplay('cart', cart);
        loadProducts();
      }
    });
}

function addToFavorites(productId) {
  fetch('products_jewish_home.json') // ← תיקון שם הקובץ
    .then(response => response.json())
    .then(data => {
      const product = data.products1.find(p => p.id === productId);
      if (product && !favorites.find(item => item.id === productId)) {
        favorites.push(product);
        updateDisplay('favorites', favorites);
      }
    });
}

function updateDisplay(sectionId, items) {
  // עדכון המספרים על הכפתורים בלבד
  if (sectionId === 'cart') {
    document.getElementById('cartCount').textContent = items.length;
  } else if (sectionId === 'favorites') {
    document.getElementById('favoritesCount').textContent = items.length;
  }
}

// הפעלה ראשונית
document.addEventListener('DOMContentLoaded', function () {
  loadProducts();
  document.getElementById('cartBtn').addEventListener('click', function () {
    showModal('cart', cart);
  });
  document.getElementById('favoritesBtn').addEventListener('click', function () {
    showModal('favorites', favorites);
  });
});

// הצגת עגלה ומועדפים בחלון קופץ
function showModal(sectionId, items) {
  let modal = document.getElementById('modal-' + sectionId);
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'modal-' + sectionId;
    modal.className = 'modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = `<div class="modal-header">
    <span>${sectionId === 'cart' ? '🛒 עגלה' : '❤️ מועדפים'}</span>
    <button class="close-btn" onclick="closeModal('${sectionId}')">✖️</button>
  </div>
  <div class="modal-content">
    ${items.length === 0 ? '<p>הרשימה ריקה</p>' : items.map(item => `
      <div class="cart-list-item">
        <span class="cart-title">${item.title}</span>
        <span class="cart-price">₪${item.price}</span>
        ${sectionId === 'cart' ? `
          <div class="quantity-controls" data-id="${item.id}">
            <button class="qty-btn minus" onclick="decreaseQuantity('${item.id}')">−</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn plus" onclick="increaseQuantity('${item.id}')">+</button>
          </div>
        ` : ''}
        <button class="icon-btn" onclick="removeFrom${sectionId.charAt(0).toUpperCase() + sectionId.slice(1)}('${item.id}')">❌ הסר</button>
      </div>
    `).join('')}
  </div>`;
  // פונקציות כמות לעגלה
  window.increaseQuantity = function (productId) {
    let item = cart.find(i => i.id === productId);
    if (item) {
      item.quantity++;
      updateDisplay('cart', cart);
      showModal('cart', cart);
      loadProducts();
    } else {
      // אם לא קיים, מוסיפים חדש
      fetch('products_jewish_home.json')
        .then(response => response.json())
        .then(data => {
          const product = data.products1.find(p => p.id === productId);
          if (product) cart.push({ ...product, quantity: 1 });
          updateDisplay('cart', cart);
          showModal('cart', cart);
          loadProducts();
        });
    }
  }
  window.decreaseQuantity = function (productId, fromProductCard) {
    let item = cart.find(i => i.id === productId);
    if (item) {
      item.quantity--;
      if (item.quantity <= 0) {
        cart.splice(cart.indexOf(item), 1);
      }
      updateDisplay('cart', cart);
      if (fromProductCard) {
        loadProducts();
      } else {
        showModal('cart', cart);
        loadProducts();
      }
    }
  }
  modal.style.display = 'block';
  // פונקציות להסרת מוצר מהמועדפים/עגלה
  window.removeFromCart = function (productId) {
    const idx = cart.findIndex(item => item.id === productId);
    if (idx !== -1) {
      cart.splice(idx, 1);
      showModal('cart', cart);
      updateDisplay('cart', cart);
    }
  }
  window.removeFromFavorites = function (productId) {
    const idx = favorites.findIndex(item => item.id === productId);
    if (idx !== -1) {
      favorites.splice(idx, 1);
      showModal('favorites', favorites);
      updateDisplay('favorites', favorites);
    }
  }
}

function closeModal(sectionId) {
  const modal = document.getElementById('modal-' + sectionId);
  if (modal) modal.style.display = 'none';
}

// חיבור כפתורים לאירועים
document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('cartBtn').addEventListener('click', function () {
    showModal('cart', cart);
  });
  document.getElementById('favoritesBtn').addEventListener('click', function () {
    showModal('favorites', favorites);
  });
});


// כפתור גלילה למעלה
var backToTop = document.querySelector('.back-to-top');
if (backToTop) {
  backToTop.onclick = function (event) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

// הופך את כפתור הגלילה לגלוי/נסתר לפי מיקום הגלילה
document.addEventListener('scroll', function () {
  var scrollTop = document.documentElement.scrollTop;
  var screnSize = document.documentElement.clientHeight;
  var backToTopBtn = document.querySelector('.back-to-top');
  if (!backToTopBtn) return;
  if (scrollTop > (screnSize / 2)) {
    backToTopBtn.classList.add('active');
  } else {
    backToTopBtn.classList.remove('active');
  }
});
