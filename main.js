// This file contains the JavaScript code for the developer portfolio.
// It may include functions for interactivity, such as handling form submissions or animations.

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contact-form');
    
    if (form) {
        form.addEventListener('submit', (event) => {
            event.preventDefault();
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            console.log('Form submitted:', data);
            alert('Thank you for your message!');
            form.reset();
        });
    }

    const scrollToTopButton = document.getElementById('scroll-to-top');
    if (scrollToTopButton) {
        scrollToTopButton.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});

document.querySelector('.theme-btn').addEventListener('click', function() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
});

// Function to get and increment visitor count
function getVisitorCount() {
    let count = localStorage.getItem('visitorCount');
    if (count === null) {
        count = 0;
    }
    count++;
    localStorage.setItem('visitorCount', count);
    return count;
}

// Function to add ordinal suffix to a number
function getOrdinalSuffix(n) {
    const s = ["th", "st", "nd", "rd"],
          v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Show the modal popup with visitor count
function showVisitorPopup() {
    const visitorCount = getVisitorCount();
    document.getElementById('visitorCount').innerText = getOrdinalSuffix(visitorCount);
    const popup = document.getElementById('visitorPopup');
    popup.style.display = 'block';

    // Close the popup when the close button is clicked
    document.querySelector('.close-btn').onclick = function() {
        popup.style.display = 'none';
    };

    // Close the popup when clicking outside of the popup content
    window.onclick = function(event) {
        if (event.target === popup) {
            popup.style.display = 'none';
        }
    };
}

// Show the popup when the page loads
window.onload = function() {
     showVisitorPopup();
 };

document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to the clicked button
            this.classList.add('active');
        });
    });
});

// Add this new JavaScript code
document.addEventListener('DOMContentLoaded', function() {
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            const descriptionText = this.querySelector('.description-text');
            descriptionText.style.display = 'block';
            setTimeout(() => {
                descriptionText.style.opacity = '1';
            }, 300); // Match the transition duration
        });

        card.addEventListener('mouseleave', function() {
            const descriptionText = this.querySelector('.description-text');
            descriptionText.style.opacity = '0';
            setTimeout(() => {
                descriptionText.style.display = 'none';
            }, 300); // Match the transition duration
        });
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all buttons
            tabButtons.forEach(btn => btn.classList.remove('active'));

            // Add active class to the clicked button
            this.classList.add('active');

            // Show the corresponding tab content and hide others
            const tab = this.getAttribute('data-tab-btn');
            tabContents.forEach(content => {
                if (content.getAttribute('data-tab-content') === tab) {
                    content.classList.add('active');
                } else {
                    content.classList.remove('active');
                }
            });
        });
    });
});
