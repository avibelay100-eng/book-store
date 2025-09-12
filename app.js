const state = {
  products: [],
  activeCategory: 'all',
  query: '',
  sort: 'featured'
};

let cart = [];
let favorites = [];

const $ = sel => document.querySelector(sel);
const $$ = sel => document.querySelectorAll(sel);

async function init() {
  try {
    const res = await fetch('data.json', { cache: 'no-store' });
    const data = await res.json();
    state.products = data.products || [];

    loadFromStorage(); // ✅ טעינה מה־Local Storage
    renderCategoryChips(data.categories);
    renderProducts();
    bindUI();
  } catch (err) {
    console.error('שגיאה בטעינת הנתונים:', err);
  }
}

function bindUI() {
  $('#searchInput').addEventListener('input', e => {
    state.query = e.target.value.trim().toLowerCase();
    renderProducts();
  });

  $('#sortSelect').addEventListener('change', e => {
    state.sort = e.target.value;
    renderProducts();
  });

  $('#cartBtn').addEventListener('click', () => openModal('cart'));
  $('#favoritesBtn').addEventListener('click', () => openModal('favorites'));
  $('#closeModal').addEventListener('click', closeModal);
  $('#overlay').addEventListener('click', closeModal);
}

function renderCategoryChips(categories) {
  const chips = $('#categoryChips');
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
    chip.dataset.slug = cat.slug;
    chip.addEventListener('click', () => {
      state.activeCategory = cat.slug;
      updateActiveChips();
      renderProducts();
    });
    chips.appendChild(chip);
  });
}

function updateActiveChips() {
  $$('#categoryChips .chip').forEach(chip => {
    chip.classList.toggle('active', chip.dataset.slug === state.activeCategory || (state.activeCategory === 'all' && !chip.dataset.slug));
  });
}

function renderProducts() {
  const grid = $('#productsGrid');
  const empty = $('#emptyState');
  grid.innerHTML = '';

  let items = [...state.products];

  if (state.activeCategory !== 'all') {
    items = items.filter(p => p.category === state.activeCategory);
  }

  if (state.query) {
    items = items.filter(p =>
      p.title.toLowerCase().includes(state.query) ||
      p.description.toLowerCase().includes(state.query)
    );
  }

  switch (state.sort) {
    case 'price-asc':
      items.sort((a, b) => a.price - b.price);
      break;
    case 'price-desc':
      items.sort((a, b) => b.price - a.price);
      break;
    case 'name-asc':
      items.sort((a, b) => a.title.localeCompare(b.title, 'he'));
      break;
    default:
      items.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  items.forEach(p => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `
      <div class="card-media">
        <img src="${p.image}" alt="${p.title}">
      </div>
      <div class="card-body">
        <h3>${p.title}</h3>
        <p>${p.description}</p>
      </div>
      <div class="card-actions">
        <span class="price">₪${p.price}</span>
        <div class="quantity-controls" data-id="${p.id}">
          <button class="qty-btn minus">−</button>
          <span class="qty-display">0</span>
          <button class="qty-btn plus">+</button>
        </div>
        <button class="btn btn-secondary add-to-fav" data-id="${p.id}">❤️</button>
      </div>
    `;
    grid.appendChild(card);
  });

  attachProductEvents();
  empty.hidden = items.length > 0;
}

function attachProductEvents() {
  document.querySelectorAll('.quantity-controls').forEach(control => {
    const id = control.dataset.id;
    const minusBtn = control.querySelector('.minus');
    const plusBtn = control.querySelector('.plus');
    const display = control.querySelector('.qty-display');

    plusBtn.addEventListener('click', () => {
      let item = cart.find(p => p.id === id);
      if (!item) {
        const product = state.products.find(p => p.id === id);
        item = { ...product, quantity: 0 };
        cart.push(item);
      }
      item.quantity++;
      display.textContent = item.quantity;
      updateCartCount();
      saveToStorage(); // ✅ שמירה
    });

    minusBtn.addEventListener('click', () => {
      let item = cart.find(p => p.id === id);
      if (item) {
        item.quantity--;
        if (item.quantity <= 0) {
          cart = cart.filter(p => p.id !== id);
          display.textContent = 0;
        } else {
          display.textContent = item.quantity;
        }
        updateCartCount();
        saveToStorage(); // ✅ שמירה
      }
    });
  });

  document.querySelectorAll('.add-to-fav').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const product = state.products.find(p => p.id === id);
      if (product && !favorites.some(f => f.id === product.id)) {
        favorites.push(product);
        updateFavoritesCount();
        saveToStorage(); // ✅ שמירה
      }
    });
  });
}

function updateCartCount() {
  $('#cartCount').textContent = cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateFavoritesCount() {
  $('#favoritesCount').textContent = favorites.length;
}

function openModal(type) {
  $('#modalTitle').textContent = type === 'cart' ? 'עגלת הקניות שלך' : 'המועדפים שלך';
  const modalContent = $('#modalContent');
  modalContent.innerHTML = '';

  const list = type === 'cart' ? cart : favorites;

  if (list.length === 0) {
    modalContent.innerHTML = '<p>אין פריטים כרגע.</p>';
  } else {
    list.forEach(item => {
      const div = document.createElement('div');
      div.className = 'modal-item';

      if (type === 'cart') {
        div.innerHTML = `
          <strong>${item.title}</strong> - ₪${item.price}
          <div class="quantity-controls" data-id="${item.id}">
            <button class="qty-btn minus">−</button>
            <span class="qty-display">${item.quantity}</span>
            <button class="qty-btn plus">+</button>
          </div>
        `;
      } else {
        div.innerHTML = `
          <strong>${item.title}</strong> - ₪${item.price}
          <button class="remove-fav" data-id="${item.id}">הסר</button>
        `;
      }

      
      modalContent.appendChild(div);
    });

    if (type === 'cart') {
      modalContent.querySelectorAll('.quantity-controls').forEach(control => {
        const id = control.dataset.id;
        const minusBtn = control.querySelector('.minus');
        const plusBtn = control.querySelector('.plus');
        const display = control.querySelector('.qty-display');

        plusBtn.addEventListener('click', () => {
          let item = cart.find(p => p.id === id);
          if (item) {
            item.quantity++;
            display.textContent = item.quantity;
            updateCartCount();
            saveToStorage();
          }
        });

        minusBtn.addEventListener('click', () => {
          let item = cart.find(p => p.id === id);
          if (item) {
            item.quantity--;
            if (item.quantity <= 0) {
              cart = cart.filter(p => p.id !== id);
              control.parentElement.parentElement.remove();
            } else {
              display.textContent = item.quantity;
            }
            updateCartCount();
            saveToStorage();
          }
        });
      });
    } else {
      modalContent.querySelectorAll('.remove-fav').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          favorites = favorites.filter(p => p.id !== id);
          updateFavoritesCount();
          saveToStorage();
          btn.parentElement.remove();
        });
      });
    }
  }


  $('#overlay').style.display = 'block';
  $('#modal').style.display = 'block';
}



function closeModal() {
  $('#overlay').style.display = 'none';
  $('#modal').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', init);

// ✅ שמירה וטעינה מ־Local Storage
function saveToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
  localStorage.setItem('favorites', JSON.stringify(favorites));
}


function loadFromStorage() {
  const savedCart = localStorage.getItem('cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartCount();
  }


  const savedFavs = localStorage.getItem('favorites');
  if (savedFavs) {
    favorites = JSON.parse(savedFavs);
    updateFavoritesCount();
  }
}

// פונקציה לגלילה למעלה
document.querySelector('.back-to-top')?.addEventListener('click', function(event){
  event.preventDefault()
  window.scrollTo({
    top:0,
    behavior: "smooth"
  })
})


document.addEventListener('scroll', function(){
  const scrollTop = document.documentElement.scrollTop;
  const screnSize= document.documentElement.clientHeight;

  if(scrollTop > (screnSize/2) ){
    document.querySelector('.back-to-top').classList.add('active')
  } else {
    document.querySelector('.back-to-top').classList.remove('active')
  }
  })