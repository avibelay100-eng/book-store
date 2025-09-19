

// --- משתנים גלובליים ---
var products = [];
var cart = [];
var favorites = [];
var activeCategory = 'all';
var query = '';
var sort = 'featured';


// --- אתחול ראשוני של האפליקציה ---
document.addEventListener('DOMContentLoaded', startApp);

// טוען נתונים מהשרת ומאתחל את כל הרכיבים
function startApp() {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'data.json');
  xhr.setRequestHeader('Cache-Control', 'no-store');
  xhr.onload = function() {
    if (xhr.status === 200) {
      var data = JSON.parse(xhr.responseText);
      if (data.products) {
        products = data.products;
      }
      loadFromStorage();
      renderCategoryChips(data.categories);
      renderProducts();
      bindUI();
    }
  };
  xhr.onerror = function() {
    console.log('שגיאה בטעינת הנתונים');
  };
  xhr.send();
}

// פונקציה עוזרת לבחירת אלמנט ב-DOM
function getElement(sel) {
  return document.querySelector(sel);
}

// קישור כל האירועים לכפתורים ולשדות קלט
function bindUI() {
  var searchInput = getElement('#searchInput');
  if (searchInput) {
    searchInput.oninput = function(e) {
      query = e.target.value.toLowerCase();
      renderProducts();
    };
  }
  var sortSelect = getElement('#sortSelect');
  if (sortSelect) {
    sortSelect.onchange = function(e) {
      sort = e.target.value;
      renderProducts();
    };
  }
  var cartBtn = getElement('#cartBtn');
  if (cartBtn) {
    cartBtn.onclick = function(e) {
      e.stopPropagation();
      openModal('cart');
    };
  }
  var favBtn = getElement('#favoritesBtn');
  if (favBtn) {
    favBtn.onclick = function(e) {
      e.stopPropagation();
      openModal('favorites');
    };
  }
  var closeModalBtn = getElement('#closeModal');
  if (closeModalBtn) {
    closeModalBtn.onclick = function(e) {
      e.stopPropagation();
      closeModal();
    };
  }
  var overlay = getElement('#overlay');
  if (overlay) {
    overlay.onclick = function(e) {
      e.stopPropagation();
      closeModal();
    };
  }
}

// מציג את כפתורי הקטגוריות (chips) ומטפל בלחיצה עליהם
function renderCategoryChips(categories) {
  var chips = getElement('#categoryChips');
  if (!chips) return;
  chips.innerHTML = '';
  var allChip = document.createElement('button');
  allChip.className = 'chip active';
  allChip.textContent = 'הכל';
  allChip.onclick = function() {
    activeCategory = 'all';
    updateActiveChips();
    renderProducts();
  };
  chips.appendChild(allChip);
  for (var i = 0; i < categories.length; i++) {
    var cat = categories[i];
    var chip = document.createElement('button');
    chip.className = 'chip';
    chip.textContent = cat.name;
    chip.setAttribute('data-slug', cat.slug);
    // שמירה על ערך נכון של slug בלחיצה (closure)
    chip.onclick = (function(slug) {
      return function() {
        activeCategory = slug;
        updateActiveChips();
        renderProducts();
      };
    })(cat.slug);
    chips.appendChild(chip);
  }
}

// מעדכן את ה-chip הפעיל (הקטגוריה שנבחרה)
function updateActiveChips() {
  var chips = document.querySelectorAll('#categoryChips .chip');
  for (var i = 0; i < chips.length; i++) {
    var chip = chips[i];
    var slug = chip.getAttribute('data-slug');
    if ((activeCategory === 'all' && !slug) || slug === activeCategory) {
      chip.classList.add('active');
    } else {
      chip.classList.remove('active');
    }
  }
}

// מציג את כל המוצרים לפי הקטגוריה, החיפוש והמיון שנבחרו
function renderProducts() {
  var grid = getElement('#productsGrid');
  var empty = getElement('#emptyState');
  if (!grid) return;
  grid.innerHTML = '';
  var items = [];
  for (var i = 0; i < products.length; i++) {
    items.push(products[i]);
  }
  if (activeCategory !== 'all') {
    var filtered = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].category === activeCategory) {
        filtered.push(items[i]);
      }
    }
    items = filtered;
  }
  if (query) {
    var filtered2 = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i].title.toLowerCase().indexOf(query) !== -1 || items[i].description.toLowerCase().indexOf(query) !== -1) {
        filtered2.push(items[i]);
      }
    }
    items = filtered2;
  }
  if (sort === 'price-asc') {
    items.sort(function(a, b) { return a.price - b.price; });
  } else if (sort === 'price-desc') {
    items.sort(function(a, b) { return b.price - a.price; });
  } else if (sort === 'name-asc') {
    items.sort(function(a, b) { return a.title.localeCompare(b.title, 'he'); });
  }
  for (var i = 0; i < items.length; i++) {
    var p = items[i];
    // מצא את הכמות הנוכחית של המוצר בעגלה
    var qty = 0;
    for (var j = 0; j < cart.length; j++) {
      if (cart[j].id === p.id) {
        qty = cart[j].quantity;
      }
    }
    var card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML =
      '<div class="card-media">' +
        '<img src="' + p.image + '" alt="' + p.title + '">' +
      '</div>' +
      '<div class="card-body">' +
        '<h3 class="card-title">' + p.title + '</h3>' +
        '<p class="card-meta">' + p.description + '</p>' +
      '</div>' +
      '<div class="card-actions">' +
        '<span class="price">₪' + p.price + '</span>' +
        '<div class="quantity-controls" data-id="' + p.id + '">' +
          '<button class="qty-btn minus">−</button>' +
          '<span class="qty-display">' + qty + '</span>' +
          '<button class="qty-btn plus">+</button>' +
        '</div>' +
        '<button class="icon-btn add-to-fav" data-id="' + p.id + '">❤️</button>' +
      '</div>';
    grid.appendChild(card);
  }
  attachProductEvents();
  if (empty) empty.hidden = items.length > 0;
}


// מוסיף אירועים לכפתורי + ו- ולמועדפים בכל כרטיס מוצר
function attachProductEvents() {
  var controls = document.querySelectorAll('.quantity-controls');
  for (var i = 0; i < controls.length; i++) {
    (function(control) {
      var id = control.getAttribute('data-id');
      var minusBtn = control.querySelector('.minus');
      var plusBtn = control.querySelector('.plus');
      var display = control.querySelector('.qty-display');
      plusBtn.onclick = function() {
        var item = null;
        for (var j = 0; j < cart.length; j++) {
          if (cart[j].id === id) item = cart[j];
        }
        if (!item) {
          for (var k = 0; k < products.length; k++) {
            if (products[k].id === id) {
              item = JSON.parse(JSON.stringify(products[k]));
              item.quantity = 0;
              cart.push(item);
            }
          }
        }
        if (item) {
          item.quantity = (item.quantity || 0) + 1;
          display.textContent = item.quantity;
          updateCartCount();
          saveToStorage();
        }
      };
      minusBtn.onclick = function() {
        var item = null;
        for (var j = 0; j < cart.length; j++) {
          if (cart[j].id === id) item = cart[j];
        }
        if (item) {
          item.quantity--;
          if (item.quantity <= 0) {
            cart = cart.filter(function(p) { return p.id !== id; });
            display.textContent = 0;
          } else {
            display.textContent = item.quantity;
          }
          updateCartCount();
          saveToStorage();
        }
      };
    })(controls[i]);
  }
  var favBtns = document.querySelectorAll('.add-to-fav');
  for (var i = 0; i < favBtns.length; i++) {
    var btn = favBtns[i];
    btn.onclick = function() {
      var id = this.getAttribute('data-id');
      var product = null;
      for (var j = 0; j < products.length; j++) {
        if (products[j].id === id) product = products[j];
      }
      var found = false;
      for (var k = 0; k < favorites.length; k++) {
        if (favorites[k].id === id) found = true;
      }
      if (product && !found) {
        favorites.push(product);
        updateFavoritesCount();
        saveToStorage();
      }
    };
  }
}


// מעדכן את מספר הפריטים בעגלה (מוצג ליד האייקון)
function updateCartCount() {
  var cartCount = getElement('#cartCount');
  if (!cartCount) return;
  var sum = 0;
  for (var i = 0; i < cart.length; i++) {
    sum += cart[i].quantity || 0;
  }
  cartCount.textContent = sum;
}

// מעדכן את מספר המועדפים (מוצג ליד האייקון)
function updateFavoritesCount() {
  var favCount = getElement('#favoritesCount');
  if (!favCount) return;
  favCount.textContent = favorites.length;
}

// פותח את המודאל של העגלה או המועדפים ומציג את התוכן
function openModal(type) {
  var modalTitle = getElement('#modalTitle');
  var modalContent = getElement('#modalContent');
  if (!modalTitle || !modalContent) return;
  if (type === 'cart') {
    modalTitle.textContent = 'עגלת הקניות שלך';
  } else {
    modalTitle.textContent = 'המועדפים שלך';
  }
  modalContent.innerHTML = '';
  var list = (type === 'cart') ? cart : favorites;
  if (list.length === 0) {
    modalContent.innerHTML = '<p>אין פריטים כרגע.</p>';
  } else {
    for (var i = 0; i < list.length; i++) {
      var item = list[i];
      var div = document.createElement('div');
      div.className = 'cart-list-item';
      var html = '';
      html += '<span class="item-title">' + item.title + '</span>';
      html += '<span class="item-price">₪' + item.price + '</span>';
      if (type === 'cart') {
        html += '<div class="quantity-controls" data-id="' + item.id + '">' +
          '<button class="qty-btn minus">−</button>' +
          '<span class="qty-display">' + item.quantity + '</span>' +
          '<button class="qty-btn plus">+</button>' +
        '</div>';
      }
      html += '<button class="icon-btn ' + (type === 'cart' ? 'remove-cart' : 'remove-fav') + '" data-id="' + item.id + '">❌</button>';
      div.innerHTML = html;
      modalContent.appendChild(div);
    }
    if (type === 'cart') {
      var controls = modalContent.querySelectorAll('.quantity-controls');
      for (var i = 0; i < controls.length; i++) {
        var control = controls[i];
        var id = control.getAttribute('data-id');
        var minusBtn = control.querySelector('.minus');
        var plusBtn = control.querySelector('.plus');
        var display = control.querySelector('.qty-display');
        plusBtn.onclick = function() {
          for (var j = 0; j < cart.length; j++) {
            if (cart[j].id === id) {
              cart[j].quantity++;
              display.textContent = cart[j].quantity;
              updateCartCount();
              saveToStorage();
            }
          }
        };
        minusBtn.onclick = function() {
          for (var j = 0; j < cart.length; j++) {
            if (cart[j].id === id) {
              cart[j].quantity--;
              if (cart[j].quantity <= 0) {
                cart = cart.filter(function(p) { return p.id !== id; });
                control.parentElement.parentElement.remove();
              } else {
                display.textContent = cart[j].quantity;
              }
              updateCartCount();
              saveToStorage();
            }
          }
        };
      }
      var removeBtns = modalContent.querySelectorAll('.remove-cart');
      for (var i = 0; i < removeBtns.length; i++) {
        var btn = removeBtns[i];
        btn.onclick = function() {
          var id = this.getAttribute('data-id');
          cart = cart.filter(function(p) { return p.id !== id; });
          updateCartCount();
          saveToStorage();
          openModal('cart');
        };
      }
    } else {
      var removeFavBtns = modalContent.querySelectorAll('.remove-fav');
      for (var i = 0; i < removeFavBtns.length; i++) {
        var btn = removeFavBtns[i];
        btn.onclick = function() {
          var id = this.getAttribute('data-id');
          favorites = favorites.filter(function(p) { return p.id !== id; });
          updateFavoritesCount();
          saveToStorage();
          openModal('favorites');
        };
      }
    }
  }
  var overlay = getElement('#overlay');
  var modal = getElement('#modal');
  if (overlay) overlay.style.display = 'block';
  if (modal) modal.style.display = 'block';
  document.body.classList.add('modal-open');
}

// סוגר את המודאל והאוברליי
function closeModal() {
  var overlay = getElement('#overlay');
  var modal = getElement('#modal');
  if (overlay) overlay.style.display = 'none';
  if (modal) modal.style.display = 'none';
  document.body.classList.remove('modal-open');
}


// שומר את העגלה והמועדפים ל-localStorage
function saveToStorage() {
  localStorage.setItem('cart', JSON.stringify(cart));
  localStorage.setItem('favorites', JSON.stringify(favorites));
}

// טוען את העגלה והמועדפים מ-localStorage
function loadFromStorage() {
  var savedCart = localStorage.getItem('cart');
  if (savedCart) {
    cart = JSON.parse(savedCart);
    updateCartCount();
  }
  var savedFavs = localStorage.getItem('favorites');
  if (savedFavs) {
    favorites = JSON.parse(savedFavs);
    updateFavoritesCount();
  }
}

// כפתור גלילה למעלה
<<<<<<< HEAD
=======
// כפתור גלילה למעלה
>>>>>>> 4efd39c34b58d4710adacd700d4193da644687fa
var backToTop = document.querySelector('.back-to-top');
if (backToTop) {
  backToTop.onclick = function(event) {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
}

// הופך את כפתור הגלילה לגלוי/נסתר לפי מיקום הגלילה
document.addEventListener('scroll', function() {
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