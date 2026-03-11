/**
 * modal.js
 * Generic modal open/close logic and specialised scan / loader modals.
 */

/**
 * Binds open, close (×-button), Escape-key and outside-click behaviour
 * to a set of modals identified by CSS class selectors.
 *
 * @param {string} modalClass  - Selector for modal container elements.
 * @param {string} btnClass    - Selector for trigger buttons.
 * @param {string} spanClass   - Selector for close (×) buttons inside modals.
 */
function toggleModal(modalClass, btnClass, spanClass) {
    const modals = document.querySelectorAll(modalClass);
    const btns   = document.querySelectorAll(btnClass);
    const spans  = document.querySelectorAll(spanClass);

    // Close the topmost open modal on Escape
    document.addEventListener('keydown', ({ key }) => {
        if (key !== 'Escape') return;
        for (const modal of modals) {
            if (modal.style.display === 'block') {
                modal.style.display = 'none';
                break;
            }
        }
    });

    // Delegate all click handling to one listener on the document
    document.addEventListener('click', ({ target }) => {
        modals.forEach((modal, i) => {
            if (target === btns[i])  modal.style.display = 'block';  // open
            if (target === spans[i]) modal.style.display = 'none';   // close via ×
            if (target === modal)    modal.style.display = 'none';   // close via backdrop
        });
    });
}

// Initialise the primary modal set (.modal / .modalBtn / .close)
toggleModal('.modal', '.modalBtn', '.close');

// ── Scan progress modal ────────────────────────────────────────────────────────

const modalScan = document.querySelector('.modal-scan');

function modalScanOn()  { modalScan.style.display = 'block'; }
function modalScanOff() { modalScan.style.display = 'none';  }

// ── Loader modal ───────────────────────────────────────────────────────────────

const modalLoader = document.querySelector('.modal-loader');

function modalLoaderOn()  { modalLoader.style.display = 'block'; }
function modalLoaderOff() { modalLoader.style.display = 'none';  }
