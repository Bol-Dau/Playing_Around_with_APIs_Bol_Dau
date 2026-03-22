/* ========================================
            APP kEY FUNCTIONALITY
   ======================================== */

const Weather_API_Key = 'YOUR_OPENWEATHERMAP_KEY_HERE';  // API key to collect weather data
const Crop_API_Key = 'YOUR_COMODITY_PRICE_API_KEY';  // API ket to collect crop prices
const Cache_Time = 600000;  // How long to keep cached price data: (10 minutes)

/* Global variables to store data that will be shared across functions */
let weatherData = null;  // Stores the last weather API response
let priceData = null;  // Stores the last crop price API response
let currentChart = null;  // Stores the current Chart.js instance.
let currentFilter = 'all';  // Makes the intial filter pill to be 'All'
let currentSort = 'name';  // Initiates sort by 'Name'
let currentCurrency = 'RWF';  // Initial currency to display prices in

/* Crop symbols that will be used alongside the crop API key to get different crop prices  */
const Crop_Symbols = ['CORN', 'CA', 'ZW-SPOT', 'SOYBEAN-SPOT', 'RR-SPOT', 'LS', 'CC'];

/* Crop names that will be shown on the table for each crop symbol */
const Crop_Names = {
    'CORN':        'Maize (Corn)',
    'CA':          'Coffee',
    'ZW-SPOT':     'Wheat',
    'SOYBEAN-SPOT':'Soybeans',
    'RR-SPOT':     'Rice',
    'LS':          'Sugar',
    'CC':          'Cocoa'
};

/* Match the users input to the desired crop with its symbol */
const Crop_Search = {
    'corn':    'CORN',
    'maize':   'CORN',
    'coffee':  'CA',
    'arabica': 'CA',
    'wheat':   'ZW-SPOT',
    'soy':     'SOYBEAN-SPOT',
    'soybean': 'SOYBEAN-SPOT',
    'beans':   'SOYBEAN-SPOT',
    'rice':    'RR-SPOT',
    'sugar':   'LS',
    'cocoa':   'CC',
    'chocolate': 'CC'
};

/* Baseline crop prices in USD  */
const BASELINES = {
    'CORN':         460,    // US cents per bushel
    'CA':           180,    // GBP per pound
    'ZW-SPOT':      10.50,   // USD per bushel
    'SOYBEAN-SPOT': 1000,   // US cents per bushel
    'RR-SPOT':      15,     // USD per hundredweight
    'LS':           550,    // USD per metric ton
    'CC':           1100    // USD per metric ton
};

/* Putting the crops in different categories */
const CROP_CATEGORIES = {
    grains:  ['CORN', 'ZW-SPOT', 'RR-SPOT'],
    coffee:  ['CA'],
    legumes: ['SOYBEAN-SPOT'],
    other:   ['LS', 'CC']
};

/* =====================================================================
   UTILITY FUNCTIONS
   Small helper functions that will be reused in different app sections
   =====================================================================  */
/* Sanitize string inputs to prevent XSS injection attacks */
function sanitize(str) {
    return String(str).replace(/[<>"'\/\\]/g, '');
}

/* Function using regex to validate an email address */
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* Function using regex to validate city name, which only allows letters and spaces, of 2 to 50 characters */
function validateCity(city) {
    return /^[a-zA-Z\s]{2,50}$/.test(city);
}

/* Function to get user initials from full name for the avatar circle */
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

/* Currency conversions for the different supported currencies. */
function formatPrice(value, currency = 'RWF') {
    const rates = { RWF: 1459, USD: 1, KES: 129, UGX: 3760 };  // Exchange rates from USD
    const converted = (value / 100) * rates[currency];  // Convert cents → USD → target currency
    return `${currency} ${Math.round(converted).toLocaleString()}`;  // toLocaleString adds comma separators (1,820)
}

/* ===================================================================
   THEME MANAGEMENT
   Handle switching between light and dark mode
   Theme preference is saved so it persists after page is refreshed
   =================================================================== */

/* Read saved theme from localStorage and apply it when page loads, and only apply default light mode is non is saved */
function initTheme() {
    const theme = localStorage.getItem('farmiq_theme') || 'light';
    if (theme === 'dark') {
        document.body.classList.add('dark');  // Adds the .dark class which overrides CSS variables

        // Update the toggle switch in Settings to show it is checked
        const toggle = document.querySelector('#dark-mode-toggle');
        if (toggle) toggle.checked = true;

        // Change the icon in the nav bar from sun to moon
        const icon = document.querySelector('.theme-icon');
        if (icon) icon.textContent = '☾';
    }

}

/* Change between theme using the theme icons on the nav bar, and save theme to the local storage for persistance */
function toggleTheme() {
    document.body.classList.toggle('dark');  // Add or remove the .dark class
    const isDark = document.body.classList.contains('dark');  // Check if dark is now active
    
    localStorage.setItem('farmiq_theme', isDark ? 'dark' : 'light');  // Save the preference
    
    // Update the toggle switch in Settings to show it is checked
    const toggle = document.querySelector('#dark-mode-toggle');
    if (toggle) {
        toggle.checked = isDark; // Sets the switch to true if dark, false if light
    }

    // Update the icon in the navbar to match the current mode
    const icon = document.querySelector('.theme-icon');
    if (icon) icon.textContent = isDark ? '☾' : '☼';
}

/* ================================================================
   LANDING PAGE - AUTH MODAL
   Handle everything on the landing page:
   opening/closing the modal, tabs, and the image carousel
   ================================================================ */

/* Set up all the event listeners and interactive elements on the landing page */
function initLandingPage() {
    const modal = document.getElementById('auth-modal');

    // All buttons that should open the auth modal (Get Started, Login, etc.)
    const openButtons = [
        document.getElementById('nav-login'),
        document.getElementById('nav-signup'),
        document.getElementById('hero-signup'),
        document.getElementById('footer-signup')
    ];

    const closeBtn = document.getElementById('modal-close');  // X button to close the auth modal
    const tabBtns = document.querySelectorAll('.tab-btn');  // Sign Up and Log In tab buttons
    const signupForm = document.getElementById('signup-form');  // Sign up form
    const loginForm = document.getElementById('login-form');  // LogIn form

    /* Check if a button exists first or not, and then add click listener to each button that opens the modal if they exist */
    openButtons.forEach(btn => {
        if (btn) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();  // Stop the link from navigating away
                modal.classList.add('active');  // Show the modal overlay
            });
        }
    });

    // Close modal when user clicks the X button
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');  // Hide the modal
        });
    }

    /* Close modal when user clicks the dark overlay outside the modal card */
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    // Handle switching between Sign Up and Log In tabs
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;  // Get the tab name from data-tab attribute

            // Remove active class from all tabs and tab contents first
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');  // Set only the clicked tab as active

            // Hide all tab contents, then show only the matching one
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(`${tab}-tab`).classList.add('active');
        });
    });

    /* liten to form submissions, and use submit event so that the enter key triggers validation */
    if (signupForm) {
        signupForm.addEventListener('submit', (e) => {
            e.preventDefault();   // Stop the form from refreshing the page
            handleSignup();
        });
    }

    // Listen to form submission on login form
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault(); // Stop the form from refreshing the page
            handleLogin();
        });
    }

    initCarousel();    // Start the auto-rotating hero image cards
    initHamburger();   // Set up the mobile menu toggle
}

/* Handle the Sign Up form submission
   Validate all fields before saving user data and redirecting */
function handleSignup() {
    // Get values from each input and remove trailing whitespace
    const name = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirm = document.getElementById('signup-confirm').value;

    clearErrors('signup');  // Remove any old error messages from previous attempts

    let valid = true;  // Assume valid until we find a problem

    // Validate the name
    if (!name || name.trim() === "") {
        showError('signup-name-error', 'Name is required'); // Name must not be empty
        valid = false;
    } else if (/\d/.test(name)) {
        showError('signup-name-error', 'Name cannot contain numbers');  // Name must not contain digits
        valid = false;
    } else if (name.length < 2) {
        showError('signup-name-error', 'Name must be at least 2 characters');  // Name must not be less than two characters
        valid = false;
    }

    // Check email format using our validateEmail function
    if (!validateEmail(email)) {
        showError('signup-email-error', 'Invalid email address');
        valid = false;
    }

    // Password must be at least 8 characters for security
    if (password.length < 8) {
        showError('signup-password-error', 'Password must be at least 8 characters');
        valid = false;
    }

    // Both password fields must match exactly
    if (password !== confirm) {
        showError('signup-confirm-error', 'Passwords do not match');
        valid = false;
    }

    // Only proceed if all validations passed
    if (valid) {
        /* Sanitize user inputs before saving to prevent any stored injection */
        localStorage.setItem('farmiq_user', sanitize(name));
        localStorage.setItem('farmiq_email', sanitize(email));
        window.location.href = 'index.html';  // Redirect the user to the main app
    }
}

/* Handle the Log In form submission */
function handleLogin() {
    // Get values from each input and remove trailing whitespace
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    clearErrors('login');   // Clear old error messages

    let valid = true;

    // Validate email format
    if (!validateEmail(email)) {
        showError('login-email-error', 'Invalid email address');
        valid = false;
    }

    // Check password length (at least 8 chars)
    if (password.length < 8) {
        showError('login-password-error', 'Password must be at least 8 characters');
        valid = false;
    }

    if (valid) {
        /* Sanitize user inputs before saving to prevent any stored injection */
        localStorage.setItem('farmiq_user', 'Demo User');
        localStorage.setItem('farmiq_email', sanitize(email));
        window.location.href = 'index.html';  // Redirect to the app
    }
}

/* Check the localstorage if a user is logged in before showing the app page */
function checkAuth() {
    const user = localStorage.getItem('farmiq_user');
    if (!user) {
        window.location.href = 'landing.html';  // Redirect them to landing page
    }
}

/* Show an error message below a form field */
function showError(id, message) {
    const el = document.getElementById(id);
    if (el) el.textContent = message;
}

/* Clear all error messages in a specific form */
function clearErrors(form) {
    document.querySelectorAll(`#${form}-form .error-text`).forEach(el => el.textContent = '');
}

/* Auto-rotating hero background image carousel */
function initCarousel() {
    // Select the three background image divs in the hero section
    const backgrounds = [
        document.getElementById('hero-bg-0'),
        document.getElementById('hero-bg-1'),
        document.getElementById('hero-bg-2')
    ];

    // A different description of text for each background image
    const subtitles = [
        'FarmIQ combines real-time weather forecasts with live crop prices to help farmers make smarter decisions about planting, harvesting, and selling.',
        'Know exactly when rain is coming so you never miss the perfect planting window for your crops.',
        'Track live global commodity prices converted to local currency — Sell at the right moment and maximise your profit.'
    ];

    const subtitleEl = document.getElementById('hero-subtitle');
    let currentIndex = 0;

    // Show the first image immediately on page load
    backgrounds[0].classList.add('active');

    setInterval(() => {
        // Fade out the current background image
        backgrounds[currentIndex].classList.remove('active');

        // Move to the next image index, looping back to 0 after the last one
        currentIndex = (currentIndex + 1) % backgrounds.length;

        // Fade in the next background image
        backgrounds[currentIndex].classList.add('active');

        // Fade out the subtitle text, swap the text, then fade it back in
        subtitleEl.classList.add('fading');  // CSS sets opacity to 0
        setTimeout(() => {
            subtitleEl.textContent = subtitles[currentIndex];  // Swap text while invisible
            subtitleEl.classList.remove('fading');  // Fade back in
        }, 500);  // Wait 500ms before swapping text

    }, 5000);  // Change image every 5 seconds
}

/* Set up the mobile hamburger menu button that shows or hides the nav links dropdown onced clicked */
function initHamburger() {
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.getElementById('nav-links');

    if (hamburger && navLinks) {
        hamburger.addEventListener('click', () => {
            navLinks.classList.toggle('active');  // Toggle shows/hides the dropdown
        });
    }
}


/* ===========================================================
   APP PAGE - INITIALIZATION
   Sets up everything on the main app page after login
   =========================================================== */

/* Main setup function for the app page that is called when the page loads - sets up user info, event listeners, and settings */
function initAppPage() {
    checkAuth();  // First checks if the user is logged in and redirects if not

    // Read user info from localStorage (saved during login/signup)
    const user = localStorage.getItem('farmiq_user');
    const email = localStorage.getItem('farmiq_email');

    // Show personalised greeting using the saved name
    document.getElementById('greeting').textContent = `Greetings, ${user}`;

    // Show the user's initials in the avatar circle in the navbar
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.textContent = getInitials(user);

    // Show user's email in the Settings section
    const userEmail = document.getElementById('user-email');
    if (userEmail) userEmail.textContent = email;

    // Wire up theme toggle button in the navbar
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    // Wire up the dark mode toggle switch inside Settings section
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    if (darkModeToggle) {
        darkModeToggle.addEventListener('change', toggleTheme);
    }

    // Wire up the Analyze button in the hero banner
    const analyzeBtn = document.getElementById('analyze-btn');
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', analyzeAll);
    }

    /* Wire up the Sign Out button in the Settings section which clears all stored data and sends user back to landing page */
    const signoutBtn = document.getElementById('signout-btn');
    if (signoutBtn) {
        signoutBtn.addEventListener('click', () => {
            // Loop through localStorage and remove only farmiq_ keys
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('farmiq_')) {
                    localStorage.removeItem(key);
                }
            });
            window.location.href = 'landing.html';  // Redirect to landing page
        });
    }

    // Wire up the Save button for the default location in Settings
    const saveLocationBtn = document.getElementById('save-location');
    if (saveLocationBtn) {
        saveLocationBtn.addEventListener('click', () => {
            const location = document.getElementById('default-location').value.trim();
            if (location) {
                localStorage.setItem('farmiq_location', sanitize(location));  // Save sanitized location
                alert('Location saved!');
            }
        });
    }

    // Pre-fill the location input with the previously saved location (if any)
    const defaultLocation = localStorage.getItem('farmiq_location');
    if (defaultLocation) {
        document.getElementById('default-location').value = defaultLocation;
    }

    /* Set up the currency dropdown */
    const currencySelect = document.getElementById('currency-select');
    if (currencySelect) {
        currencySelect.value = localStorage.getItem('farmiq_currency') || 'RWF';
        currentCurrency = currencySelect.value;  // Sync the global variable

        /* When currency changes, save it and re-render the price table in the new currency */
        currencySelect.addEventListener('change', (e) => {
            currentCurrency = e.target.value;
            localStorage.setItem('farmiq_currency', currentCurrency);
            if (priceData) renderPriceTable();  // Only re-render if we have price data already
        });
    }

    /* Set up notifications toggle in Settings */
    const notifsToggle = document.getElementById('notifs-toggle');
    if (notifsToggle) {
        notifsToggle.checked = localStorage.getItem('farmiq_notifs') === 'true';  // Restore saved state
        notifsToggle.addEventListener('change', (e) => {
            localStorage.setItem('farmiq_notifs', e.target.checked);  // Save new preference
        });
    }

    initPriceControls();  // Set up filter pills, sort buttons, and search input

    /* Link the 'Go to Analyze' button in planting forecast and live crop prices to the Hero page */
    const forecastGoBtn = document.getElementById('forecast-go-btn');
    if (forecastGoBtn) {
        forecastGoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.hero-banner').scrollIntoView({ behavior: 'smooth' });
        });  // Scroll to the analysis section once clicked
    }

    const pricesGoBtn = document.getElementById('prices-go-btn');
    if (pricesGoBtn) {
        pricesGoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            document.querySelector('.hero-banner').scrollIntoView({ behavior: 'smooth' });
        });  // Scroll to the analysis section once clicked
    }
}

/* =================================================================
   WEATHER API
   Fetches weather data and renders the forecast section
   ================================================================= */

/* Fetch 5-day weather forecast from OpenWeatherMap for a given city and return an error if the request fails so the caller can show an error message */
async function fetchWeather(city) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${Weather_API_Key}&units=metric`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Weather data unavailable');  // Trigger catch block in analyzeAll
    return await response.json();
}

/* Display the weather forecast using API data. */
function renderForecast(data, city, cropName) {

    // Show the city name in the location badge at the top of the section
    document.getElementById('location-badge').textContent = city;

    // Group all 3-hourly readings by date so we can find the true daily high and low,
    const dayGroups = {};  // { "2025-07-14": [ reading, reading, ... ], ... }

    for (const item of data.list) {
        // toISOString gives "2025-07-14T09:00:00.000Z" — we take only the date part
        const dateKey = new Date(item.dt * 1000).toISOString().slice(0, 10);
        if (!dayGroups[dateKey]) dayGroups[dateKey] = [];
        dayGroups[dateKey].push(item);
    }

    // Separate today from the next 5  days 
    const todayKey = new Date().toISOString().slice(0, 10);

    // All date keys sorted chronologically
    const allKeys = Object.keys(dayGroups).sort();

    // Store today's readings in the variable todayReadings
    const todayReadings = dayGroups[todayKey] || [];

    // Future days = everything after today, shown on 5 cards
    const futureKeys = allKeys.filter(k => k > todayKey).slice(0, 5);

    // Finds the daily max and min temperatures, and picks the midday reading for other fields.
    function buildDaySummary(readings) {
        // Max temp = highest temp_max across all readings of that day
        const trueMax = Math.round(Math.max(...readings.map(r => r.main.temp_max)));
        // Min temp = lowest  temp_min across all readings of that day
        const trueMin = Math.round(Math.min(...readings.map(r => r.main.temp_min)));

        // Pick the reading closest to midday (12:00) as the representative for condition description, humidity, wind, and rain chance
        const midday = readings.reduce((best, r) => {
            const h    = new Date(r.dt * 1000).getHours();
            const bh   = new Date(best.dt * 1000).getHours();
            return Math.abs(h - 12) < Math.abs(bh - 12) ? r : best;
        });

        return { ...midday, trueMax, trueMin };
    }

    // Function that decide badge + planting recommendation from a day summary
    function getDayStatus(summary) {
        const desc = summary.weather[0].description.toLowerCase();  // Convert text description of the weather to lower case
        const pop  = summary.pop || 0;  // Get the chance of rain using pop, and set zero if it doesn't exist
        const hum  = summary.main.humidity;  // Get the humidity percentage

        // Decide the best action to take based on the weather conditions
        if (desc.includes('thunder') || desc.includes('storm')) {
            return { badge: 'caution', badgeText: 'Storm',   planting: 'Avoid: storms expected' };
        }
        if (desc.includes('extreme') || desc.includes('tornado') || desc.includes('hurricane')) {
            return { badge: 'danger',  badgeText: 'Danger',  planting: 'Dangerous: do not go outside' };
        }
        if (pop > 0.6 || desc.includes('heavy rain') || desc.includes('heavy shower')) {
            return { badge: 'plant',   badgeText: 'Rain',    planting: 'Good for planting' };
        }
        if (pop > 0.3 || desc.includes('light rain') || desc.includes('moderate rain') || desc.includes('drizzle')) {
            return { badge: 'plant',   badgeText: 'Shower',  planting: 'Good for planting' };
        }
        if (desc.includes('overcast') || desc.includes('broken clouds')) {
            return { badge: 'dry',     badgeText: 'Cloudy',  planting: 'Moderate: monitor soil moisture' };
        }
        // Show the best action to take based on the levels of humidity
        if (hum > 55 && pop > 0.15) {
            return { badge: 'plant',   badgeText: 'Humid',   planting: 'Reasonable for planting' };
        }
        if (hum < 35 || desc.includes('clear') || desc.includes('sunny')) {
            return { badge: 'dry',     badgeText: 'Dry',     planting: 'Good for harvesting: consider irrigation to plant' };
        }
        // Default: stable but not ideal
        return     { badge: 'dry',     badgeText: 'Fair',    planting: 'Not ideal for planting' };
    }

    // Render the 5 next day cards excluding the current day
    const daysContainer = document.getElementById('forecast-days');

    if (futureKeys.length === 0) {
        // Edge case: API only returned today's data
        daysContainer.innerHTML = '<p style="padding:1rem;color:var(--text-muted)">No upcoming forecast data available.</p>';
    } else {
        daysContainer.innerHTML = futureKeys.map(key => {
            const readings = dayGroups[key];  // Get all the 3-hourly readings for the day
            const s        = buildDaySummary(readings);  // Pass the readings through the buildDaySummary to extrat important data (Max and Min temps, midday readings)
            const status   = getDayStatus(s);  // Get the day status
            const dateObj   = new Date(s.dt * 1000);  // Convert timestamp into a date
            const shortDay  = dateObj.toLocaleDateString('en', { weekday: 'short' });  // Short day name: "Mon", "Tue", "Sat", "Sun" etc.
            const shortDate = dateObj.toLocaleDateString('en', { day: 'numeric', month: 'short' });  // Short date: "14 Jul"

            const tempMax    = s.trueMax;   // Maximum temperature
            const tempMin    = s.trueMin;  // Minimum temperature
            const humidity   = s.main.humidity;  // Humidity percentage
            const wind       = s.wind.speed.toFixed(1);  // Wind speed in one decimal place
            const pop        = s.pop || 0;  // Chance of rain, 0 if not present
            const rainChance = Math.round(pop * 100);  // Convert chance of rain into percentage
            const soilState  = humidity > 60 ? 'Moist' : 'Dry';  // Soil state based on humidity level

            // Rain condition
            const condition  = s.weather[0].description.replace(/\b\w/g, c => c.toUpperCase());

            return `
                <div class="day-card">
                    <div class="day-card-top">
                        <span class="day-short">${shortDay}</span>   
                    </div>
                    <div class="day-condition">${condition}</div>
                    <div class="temp-range">
                        <span class="temp-max">&#8593;${tempMax}&deg;C</span>
                        <span class="temp-min">&#8595;${tempMin}&deg;C</span>
                    </div>
                    <div class="day-stats-grid">
                        <span class="ds-label">Chance of rain:</span><span class="ds-value">${rainChance}%</span>
                        <span class="ds-label">Humidity:</span><span class="ds-value">${humidity}%</span>
                        <span class="ds-label">Wind Speed:</span><span class="ds-value">${wind} m/s</span>
                        <span class="ds-label">Soil State: </span><span class="ds-value">${soilState}</span>
                    </div>
                    <span class="day-badge ${status.badge}">${status.badgeText}</span>
                    <div class="planting-note">${status.planting}</div>
                </div>
            `;
        }).join('');
    }

    // TODAY'S detailed card below the forecast row, shows full date, condition, max/min, and all stats for the current day.
    const statsEl = document.getElementById('forecast-stats');

    if (todayReadings.length === 0) {
        // If the API has no data for today, hide the block
        statsEl.innerHTML = '';
    } else {
        const t        = buildDaySummary(todayReadings);  // Pass the readings through the buildDaySummary to extrat important data (Max and Min temps, midday readings)
        const tStatus  = getDayStatus(t);  // Get the day status
        const tDate    = new Date(t.dt * 1000);  // Convert timestamp into a date

        // Full date label: "Friday, 20 Mar 2026"
        const fullLabel = tDate.toLocaleDateString('en', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        });

        const tHum      = t.main.humidity;  // Humidity percentage
        const tWind     = t.wind.speed.toFixed(1); // Wind speed in one decimal place
        const tSoil     = tHum > 60 ? 'Moist' : 'Dry';  // Soil state based on humidity level
        const tRain     = Math.round((t.pop || 0) * 100);  // Convert chance of rain into percentage
        const tCondition = t.weather[0].description.replace(/\b\w/g, c => c.toUpperCase());  // Make the first letters of each word of the weather condition into uppercase to look better

        statsEl.innerHTML = `
            <div class="today-badge-label">${fullLabel} &mdash; Today</div>
            <div class="today-condition-row">
                <span class="today-condition">${tCondition}</span>
                <span class="day-badge ${tStatus.badge}">${tStatus.badgeText}</span>
            </div>
            <div class="today-stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Max Temp</div>
                    <div class="stat-value temp-max">${t.trueMax}&deg;C</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Min Temp</div>
                    <div class="stat-value temp-min">${t.trueMin}&deg;C</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Rain Chance</div>
                    <div class="stat-value">${tRain}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Humidity</div>
                    <div class="stat-value">${tHum}%</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Wind Speed</div>
                    <div class="stat-value">${tWind} m/s</div>
                </div>
                <div class="stat-card">
                    <div class="stat-label">Soil State</div>
                    <div class="stat-value">${tSoil}</div>
                </div>
            </div>
            <div class="planting-note" style="margin-top:0.75rem">${tStatus.planting}</div>
        `;
    }

    // Simple advice with the crop being analyzed
    const crop = (cropName && cropName.trim().length > 0)
        ? sanitize(cropName.trim())
        : 'any crop';  // Crop name being analyzed, or any crop if name not entered

    // Pass all the next6 days through buildDaySummary to find all the possibilities of rains and storms of each day
    const allDays = allKeys.slice(0, 6).flatMap(k => {
        const r = dayGroups[k];
        return r ? [buildDaySummary(r)] : [];
    }); 

    // Find days with rain or storms, and dry days
    const rainDays = allDays
        .filter(d => (d.pop || 0) > 0.3 || d.weather[0].description.toLowerCase().includes('rain'))
        .map(d => new Date(d.dt * 1000).toLocaleDateString('en', { weekday: 'long' }));

    // Find days with storms, and dry days
    const stormDays = allDays
        .filter(d => d.weather[0].description.toLowerCase().includes('thunder'))
        .map(d => new Date(d.dt * 1000).toLocaleDateString('en', { weekday: 'long' }));

    // Find days without rain or storms, and with low humidity
    const dryDays = allDays
        .filter(d => (d.pop || 0) < 0.1 && d.main.humidity < 40)
        .map(d => new Date(d.dt * 1000).toLocaleDateString('en', { weekday: 'long' }));

    // Create personalized advices based on the weather data available
    let advice;
    if (stormDays.length > 0 && rainDays.length > 0) {
        advice = `Rain expected on ${rainDays.join(', ')} — ideal for planting ${crop}. Avoid ${stormDays.join(', ')} due to storms.`;  //  Plant on rainny days and avoid stormy days
    } else if (stormDays.length > 0) {
        advice = `Storms expected on ${stormDays.join(', ')}. Delay planting ${crop} until conditions improve.`;  // Give warning on only stormy days
    } else if (rainDays.length > 0) {
        advice = `Rain expected on ${rainDays.join(', ')} — ideal for planting ${crop}.`;  // Plant on only rainy days
    } else if (dryDays.length >= 3) {
        advice = `Dry conditions expected most of the week. Good time to harvest ${crop} if ready. Consider irrigation before planting.`;  // Harvest or irrigate when dry days are more than 3
    } else {
        advice = `Weather conditions are stable this week. Monitor daily before planting ${crop}.`;  // Default if no condition found
    }

    document.getElementById('planting-advice').textContent = advice;  // Show the advice in the right place on the page
}

/* ================================================================
   COMMODITY API + CACHING
   Fetches live crop prices and caches them for 10 minutes
   to avoid unnecessary API calls and stay within rate limits
   ================================================================ */

// Fetch crop prices from json file
async function fetchPrices() {
    // Fectch the data from a json file
    const response = await fetch('js/crop.json');  // Wait till the file is fully loaded before moving to the next step
    if (!response.ok) throw new Error('Price data unavailable');  // Through an error if the file is missing
    const savedData = await response.json();  // Convert the data into json

    // Loop through symbols for each crop
    const combinedRates = {};
    for (const symbol of Crop_Symbols) {
        if (savedData.success && savedData.rates[symbol] !== undefined) {
            combinedRates[symbol] = savedData.rates[symbol];
        }
    }

    const formattedData = { data: { rates: combinedRates } };
    localStorage.setItem('farmiq_prices_cache', JSON.stringify({
        timestamp: Date.now(),
        data: formattedData
    }));

    updateTimestamp(Date.now());
    return formattedData;
}

/* Update the timestamp - the time the data was last fetched (in milliseconds) */
function updateTimestamp(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);  // Convert ms difference to minutes
    document.getElementById('update-badge').textContent = `Updated ${minutes} min ago`;  // Display the time on the page
}

// Build and display the crop prices table which uses the global priceData, currentFilter, currentSort, and currentCurrency variables
function renderPriceTable() {
    const rates = priceData.data.rates;  // Convert the prices into the active currency

    // Map all the symbols to their full names, and calculate the % change from the baseline price
    let crops = Object.keys(rates).map(symbol => ({
        symbol: symbol,
        name: Crop_Names[symbol] || symbol,  // Show "Wheat" not "ZW-SPOT"
        unit: 'per kilogram',  // Unit being measured
        price: rates[symbol],  // price of the crop being measured
        change: BASELINES[symbol]
            ? ((rates[symbol] - BASELINES[symbol]) / BASELINES[symbol] * 100).toFixed(1)
            : '0.0'  // Calculate if the price increased or decreased from the baseline price
    }));

    // Apply category filter
    if (currentFilter !== 'all') {
        crops = crops.filter(c => CROP_CATEGORIES[currentFilter]?.includes(c.symbol));  // Group the crops into categories and display only the choosen category when clicked
    }

    // Apply search which matches on display name OR what user typed via CROP_SEARCH_MAP
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();  // Get what the user typed and turn it into lowercase
    if (searchTerm) {
        const mappedSymbol = Crop_Search[searchTerm]; // Get the symbol of the string from Crop_Search and store it in the variable mappedSymbol
        crops = crops.filter(c =>
            c.name.toLowerCase().includes(searchTerm) ||   // match to the actuall crop name eg "Maize (Corn)"
            c.symbol.toLowerCase().includes(searchTerm) || // match to the actual crop symbol eg "CORN"
            (mappedSymbol && c.symbol === mappedSymbol)    // exact match via map
        );
    }

    // Apply sort
    if (currentSort === 'name') {
        crops.sort((a, b) => a.name.localeCompare(b.name));  // Sorts alphabetically
    } else if (currentSort === 'price-asc') {
        crops.sort((a, b) => a.price - b.price);  // Sorts from the lowest to highest price
    } else if (currentSort === 'price-desc') {
        crops.sort((a, b) => b.price - a.price);  // Sorts from the highest to lowest price
    }

    // Carefully format the text on the page using html
    const tableHTML = `
        <div class="price-row header">
            <div>Crop</div>
            <div>Unit</div>
            <div>Price</div>
            <div>Change</div>
        </div>
        ${crops.map(crop => `
            <div class="price-row">
                <div>${crop.name}</div>
                <div>${crop.unit}</div>
                <div>${formatPrice(crop.price, currentCurrency)}</div>
                <div>
                    <span class="change-badge ${crop.change >= 0 ? 'positive' : 'negative'}">
                        ${crop.change >= 0 ? '+' : ''}${crop.change}%
                    </span>
                </div>
            </div>
        `).join('')}
    `;

    document.getElementById('price-table').innerHTML = tableHTML;
    renderChart(crops);  // Display the table in its right place on the table
}

// Render the Chart.js horizontal bar chart for crop prices
function renderChart(crops) {
    const ctx = document.getElementById('price-chart');  // Where the chart will be placed
    if (!ctx) return;  // Exit if chart element is not on the page

    // Destroy the existing chart before creating a new one to avoid errors from being thrown at us
    if (currentChart) {
        currentChart.destroy();
    }

    // Convert prices to the currently selected currency for the chart
    const rates = { RWF: 1450, USD: 1, KES: 129, UGX: 3760 };
    const labels = crops.map(c => c.name);  // Crop names for the Y axis
    const data = crops.map(c => (c.price / 100) * rates[currentCurrency]);  // Converted prices for X axis

    // Create a new Chart.js bar chart
    currentChart = new Chart(ctx, {
        type: 'bar',  // Make it a bar chart
        data: {
            labels: labels,
            datasets: [{
                label: `Price (${currentCurrency})`,  // Put prices on the axis
                data: data,
                backgroundColor: '#1a6b3c'  // Use the brand color green for the bars
            }]
        },
        options: {
            indexAxis: 'y',  // Horizontal bars instead of vertical
            responsive: true,  // Chart resizes with the browser window
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }  // Hide the legend to create a clean chart
            }
        }
    });
}

// Set up the interactive controls in the prices section, filter pills, sort buttons, and the search input
function initPriceControls() {
    // Add click listener to each filter pill
    document.querySelectorAll('.pill').forEach(pill => {
        pill.addEventListener('click', () => {
            // Remove active from all pills, then set only clicked one as active
            document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');  // Highlight the clicked pill
            currentFilter = pill.dataset.filter;  // Read the filter value from data-filter attribute and saves it
            if (priceData) renderPriceTable();  // Re-render only if we have data
        });
    });

    // Add click listener to each sort button
    document.querySelectorAll('.sort-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sort-btn').forEach(b => b.classList.remove('active'));  // Remove the highlight from all the buttons
            btn.classList.add('active');  // Higlight the active button
            currentSort = btn.dataset.sort;  // Read the sort value from data-sort attribute
            if (priceData) renderPriceTable();
        });
    });

    // Add real-time search that re-renders table every time user types a character
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            if (priceData) renderPriceTable();
        });
    }
}

/* ====================================================================
   SMART ADVICE LOGIC
   Combines weather forecast + crop prices to generate personalized farming advice
   ==================================================================== */

// Generate advice cards by looking at both weather and price data together
function generateAdvice() {
    // Only run if both weather and price data are available
    if (!weatherData || !priceData) return;

    const rates = priceData.data.rates;  // A list of current crop price rates
    const days = weatherData.list.slice(0, 10);  // Grab the first 10 weather readings
    const rainNext2Days = days.slice(0, 2).some(d => (d.pop || 0) > 0.4);  // Return true if one of the next two days has a higher chance of rain than 40%
    const adviceCards = [];  // Array to hold each generated advice card

    /* ===================================================
      Personalized advices for different crops
      ==================================================== */
      // ===== MAIZE (CORN) advice =====
    const cornChange   = ((rates['CORN'] - BASELINES['CORN']) / BASELINES['CORN'] * 100);  // Calculate the percentage differenece between today's price and baseline prices
    
    if (rainNext2Days && cornChange > 5) {
        // Perfect time for planting if rain is coming and prices are rising
        adviceCards.push({
            color: 'green',
            title: 'Plant maize now',
            desc: 'Rain coming and prices are rising',
            action: 'Plant immediately'
        });
    } else if (cornChange > 10 && !rainNext2Days) {
        // Price high but no rain = good time to sell stored stock, wait to plant
        adviceCards.push({
            color: 'amber',
            title: 'Hold your maize stock',
            desc: 'Prices are high, consider selling soon',
            action: 'Monitor market'
        });
    } else if (cornChange < -5) {
        // Bad time to sell stock since the market is unfavorable
        adviceCards.push({
            color: 'red',
            title: 'Avoid maize this season',
            desc: 'Market prices are unfavorable',
            action: 'Wait for better prices'
        });
    } else {
        // Monitor if there are no strong signals of any weather condition ahead
        adviceCards.push({
            color: 'gray',
            title: 'Monitor maize',
            desc: 'Conditions are stable',
            action: 'No action needed'
        });
    }

    // ===== COFFEE advice =====
    const coffeeChange = ((rates['CA'] - BASELINES['CA']) / BASELINES['CA'] * 100);
    

    if (coffeeChange > 10) {
        // Sell Coffee if the current prices are higher than the baseline price
        adviceCards.push({
            color: 'green',
            title: 'Sell coffee now',
            desc: 'Prices are at peak levels',
            action: 'Sell immediately'
        });
    } else if (coffeeChange < -5) {
        // Wait to sell and for prices to recover once prices are lower than the baseline price of coffee
        adviceCards.push({
            color: 'red',
            title: 'Hold coffee stock',
            desc: 'Wait for prices to recover',
            action: 'Store and wait'
        });
    } else {
        // No urgent action needed once the market is stable
        adviceCards.push({
            color: 'gray',
            title: 'Monitor coffee',
            desc: 'Prices are stable',
            action: 'No action needed'
        });
    }

    // ===== RICE advice =====
    const riceChange   = ((rates['RR-SPOT'] - BASELINES['RR-SPOT']) / BASELINES['RR-SPOT'] * 100);

    if (rainNext2Days && riceChange > 5) {
        // Plant rice if there is rain and the prices are rising
        adviceCards.push({
            color: 'green',
            title: 'Plant rice now',
            desc: 'Good weather and rising prices',
            action: 'Plant immediately'
        });
    } else {
        // No urgent action needed once the conditions are stable
        adviceCards.push({
            color: 'gray',
            title: 'Monitor rice',
            desc: 'Conditions are stable',
            action: 'No action needed'
        });
    }

    // Build HTML from the adviceCards array and inject into the advice section
    const html = adviceCards.map(card => `
        <div class="advice-card ${card.color}">
            <span class="dot"></span>
            <h3>${card.title}</h3>
            <p>${card.desc}</p>
            <span class="action-badge">${card.action}</span>
        </div>
    `).join('');

    document.getElementById('advice-content').innerHTML = html;
}

/* =================================================================
   ANALYZE ALL
   Main function that runs when user clicks the Analyze button
   Validates inputs, shows loading spinners, calls both APIs, and generates advice
   ================================================================= */

async function analyzeAll() {
    const city = document.getElementById('city-input').value.trim();  // Get the city name
    const crop = document.getElementById('crop-input').value.trim();  // Get the crop name
    const errorEl = document.getElementById('input-error');  // The text area to display errors

    errorEl.textContent = '';  // Clear previous input error message

    // Validate city name before making API call 
    if (!validateCity(city)) {
        errorEl.textContent = 'Please enter a valid city name (letters only, 2-50 characters)';
        return;  // Stops and doesn't call API with invalid input
    }

    // List of allowed crops
    const allowedCrops = ['coffee', 'maize', 'rice', 'cocoa', 'wheat', 'soybeans', 'sugar'];
    const normalizedCrop = crop.toLowerCase().trim();  // Convert user input into lowercase and trim white spaces

    // Crop validation
    if (!normalizedCrop) {
        errorEl.textContent = 'Please enter a crop type';
        return;  // Print error if user input is empty
    }

    if (!allowedCrops.includes(normalizedCrop)) {
        // Create a string to show the user the allowed crops
        const options = allowedCrops.join(', ');
        errorEl.textContent = `Crop not supported. Please choose from: ${options}`;
        return;  // Show the user allowed crop names in the error message
    }

    // Hide the "start prompt" messages when the user has clicked Analyze
    const forecastPrompt = document.getElementById('forecast-prompt');
    if (forecastPrompt) forecastPrompt.classList.add('hidden');  // Hide the instruction message when user clicks analyze data
    const pricesPrompt = document.getElementById('prices-prompt');
    if (pricesPrompt) pricesPrompt.classList.add('hidden');  // Hide the instruction message when user clicks analyze to fetch data

    // Hide previous error cards before fetching fresh data
    document.getElementById('forecast-error').classList.add('hidden');
    document.getElementById('prices-error').classList.add('hidden');

    // Fetch weather data using try/catch so a failed API call doesn't crash everything
    try {
        weatherData = await fetchWeather(sanitize(city));  // Sanitize city before passing to URL
        renderForecast(weatherData, sanitize(city), crop);  // Pass crop name so advice uses it
    } catch (error) {
        // Show error card with a helpful message when the API fails
        const errorCard = document.getElementById('forecast-error');
        errorCard.textContent = 'Weather data unavailable. Check your city name or try again later.';
        errorCard.classList.remove('hidden');  // Make the error card visible
    }

    // Fetch crop prices separately using try/catch so a weather failure doesn't stop prices from loading
    try {
        priceData = await fetchPrices();
        renderPriceTable();
    } catch (error) {
        const errorCard = document.getElementById('prices-error');
        errorCard.textContent = 'Price data unavailable. Please try again later.';
        errorCard.classList.remove('hidden');
    }

    // Only generate advice only when both data have been succeefully feteched
    if (weatherData && priceData) {
        generateAdvice();
    }
}

/* =================================================================
   INITIALIZATION
   ================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    initTheme();  // Apply saved theme before anything else to avoid flash of wrong theme

    // Detect which page we are on by checking the URL and looking for page-specific elements
    const isLanding = window.location.pathname.includes('landing.html') || window.location.pathname.endsWith('/') || (!window.location.pathname.includes('index.html') && document.getElementById('auth-modal'));

    if (isLanding) {
        initLandingPage();  // Set up landing page
    } else {
        initAppPage();  // Set up app page
    }
});