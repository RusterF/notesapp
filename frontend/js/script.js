// frontend/js/script.js
document.addEventListener("DOMContentLoaded", function () {
  const noteForm = document.getElementById("note-form");
  const notesList = document.getElementById("notes-list");
  const notesCount = document.getElementById("notes-count");
  let currentNoteId = null;

  // Auth elements
  const authSection = document.getElementById("auth-section");
  const appContent = document.getElementById("app-content");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const logoutBtn = document.getElementById("logout-btn");
  const showRegisterLink = document.getElementById("show-register-link");
  const showLoginLink = document.getElementById("show-login-link");
  const userGreeting = document.getElementById("user-greeting");
  const authMessage = document.getElementById("auth-message");

  // Function to get token from localStorage
  function getToken() {
    return localStorage.getItem("accessToken");
  }

  // Function to set token in localStorage
  function setToken(token, username) {
    localStorage.setItem("accessToken", token);
    localStorage.setItem("username", username); // Store username for greeting
  }

  // Function to remove token from localStorage
  function removeToken() {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("username");
  }

  // Update UI based on authentication state
  function updateUIForAuthState() {
    const token = getToken();
    if (token) {
      authSection.classList.add("hidden");
      appContent.classList.remove("hidden");
      const username = localStorage.getItem("username");
      if (userGreeting) userGreeting.textContent = `Hi, ${username || "User"}!`;
      fetchNotes(); // Fetch notes when user is logged in
    } else {
      authSection.classList.remove("hidden");
      appContent.classList.add("hidden");
      if (notesList)
        notesList.innerHTML =
          '<p class="p-6 text-center text-gray-500">Please log in to see your notes.</p>';
      if (notesCount) updateNotesCount(0);
      if (noteForm) noteForm.reset(); // Reset note form if user logs out
      currentNoteId = null;
      if (document.getElementById("submit-btn")) {
        // Ensure submit-btn exists
        document.getElementById("submit-btn").innerHTML =
          '<i class="fas fa-save mr-2"></i><span>Save Note</span>';
      }
    }
  }

  // --- Event Listeners for Auth Forms ---
  if (showRegisterLink) {
    showRegisterLink.addEventListener("click", (e) => {
      e.preventDefault();
      loginForm.classList.add("hidden");
      registerForm.classList.remove("hidden");
      authMessage.textContent = "";
    });
  }

  if (showLoginLink) {
    showLoginLink.addEventListener("click", (e) => {
      e.preventDefault();
      registerForm.classList.add("hidden");
      loginForm.classList.remove("hidden");
      authMessage.textContent = "";
    });
  }

  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      authMessage.textContent = "";
      const username = loginForm.username.value;
      const password = loginForm.password.value;
      try {
        const response = await fetch(`${BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (data.success) {
          setToken(data.accessToken, data.username);
          updateUIForAuthState();
          showToast("Logged in successfully!");
        } else {
          authMessage.textContent = data.message || "Login failed.";
          showToast(data.message || "Login failed.", true);
        }
      } catch (error) {
        console.error("Login error:", error);
        authMessage.textContent = "Network error during login.";
        showToast("Network error during login.", true);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      authMessage.textContent = "";
      const username = registerForm.username.value;
      const password = registerForm.password.value;
      const confirmPassword = registerForm["confirm-password"].value;

      if (password !== confirmPassword) {
        authMessage.textContent = "Passwords do not match.";
        showToast("Passwords do not match.", true);
        return;
      }
      if (password.length < 6) {
        authMessage.textContent = "Password must be at least 6 characters.";
        showToast("Password must be at least 6 characters.", true);
        return;
      }

      try {
        const response = await fetch(`${BASE_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        const data = await response.json();
        if (data.success) {
          showToast("Registration successful! Please log in.");
          registerForm.classList.add("hidden");
          loginForm.classList.remove("hidden"); // Show login form
          loginForm.username.value = username; // Pre-fill username
          authMessage.textContent = "";
        } else {
          authMessage.textContent = data.message || "Registration failed.";
          showToast(data.message || "Registration failed.", true);
        }
      } catch (error) {
        console.error("Registration error:", error);
        authMessage.textContent = "Network error during registration.";
        showToast("Network error during registration.", true);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      removeToken();
      updateUIForAuthState();
      showToast("Logged out successfully.");
    });
  }

  // --- Modified Notes Functions ---

  // Fetch all notes and display them
  async function fetchNotes() {
    const token = getToken();
    if (!token) {
      if (notesList)
        notesList.innerHTML =
          '<p class="p-6 text-center text-gray-500">Please log in to see your notes.</p>';
      if (notesCount) updateNotesCount(0);
      return;
    }

    if (!notesList) return; // Guard if notesList is not on the page
    notesList.innerHTML = `
        <div class="p-6 text-center text-gray-500">
          <i class="fas fa-spinner fa-spin text-xl"></i>
          <p class="mt-2">Loading notes...</p>
        </div>`;

    try {
      const response = await fetch(`${BASE_URL}/api/notes`, {
        headers: { Authorization: `Bearer ${token}` }, // Add token
      });

      if (response.status === 401 || response.status === 403) {
        showToast("Session expired or invalid. Please log in again.", true);
        removeToken();
        updateUIForAuthState();
        return;
      }

      const data = await response.json();

      if (data.success) {
        displayNotes(data.data);
      } else {
        console.error("Failed to fetch notes:", data.message);
        notesList.innerHTML = `
            <div class="p-6 text-center text-red-500">
              <i class="fas fa-exclamation-circle text-xl"></i>
              <p class="mt-2">Failed to load notes: ${data.message}</p>
            </div>`;
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      notesList.innerHTML = `
          <div class="p-6 text-center text-red-500">
            <i class="fas fa-exclamation-circle text-xl"></i>
            <p class="mt-2">Network error. Please check your connection.</p>
          </div>`;
    }
  }

  // Display notes in the UI (mostly unchanged, ensure it's called correctly)
  function displayNotes(notes) {
    //
    if (!notesList) return;
    notesList.innerHTML = "";
    if (notesCount) updateNotesCount(notes.length);

    if (notes.length === 0) {
      notesList.innerHTML = `
          <div class="p-8 text-center">
            <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 text-gray-400 mb-4">
              <i class="fas fa-sticky-note text-2xl"></i>
            </div>
            <p class="text-gray-500">No notes found. Create your first note!</p>
          </div>
        `;
      return;
    }

    notes.forEach((note) => {
      const noteElement = document.createElement("div");
      noteElement.className = "p-6 hover:bg-gray-50 transition duration-150";
      noteElement.dataset.id = note.id || note._id; // Use note._id if id is not present after creation

      const formattedDate = formatDate(new Date(note.createdAt));

      const tagsHtml =
        note.tags && note.tags.length
          ? note.tags
              .map(
                (tag) =>
                  `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
              <i class="fas fa-tag text-xs mr-1"></i>${tag}
            </span>`
              )
              .join(" ")
          : "";

      noteElement.innerHTML = `
          <div class="flex items-start justify-between">
            <h3 class="text-lg font-medium text-gray-900">${note.title}</h3>
            <span class="text-xs text-gray-500 flex items-center">
              <i class="far fa-clock mr-1"></i> ${formattedDate}
            </span>
          </div>
          <div class="mt-2 text-sm text-gray-600 whitespace-pre-line line-clamp-3">${
            note.content
          }</div>
          <div class="mt-3 flex flex-wrap gap-2">${tagsHtml}</div>
          <div class="mt-4 flex space-x-2">
            <button class="edit-btn inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    data-id="${note.id || note._id}">
              <i class="fas fa-edit mr-1"></i> Edit
            </button>
            <button class="delete-btn inline-flex items-center px-3 py-1 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    data-id="${note.id || note._id}">
              <i class="fas fa-trash-alt mr-1"></i> Delete
            </button>
          </div>
        `;

      notesList.appendChild(noteElement);
    });

    // Add event listeners to edit and delete buttons
    document.querySelectorAll(".edit-btn").forEach((btn) => {
      btn.addEventListener("click", handleEditNote);
    });

    document.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", handleDeleteNote);
    });
  }

  function formatDate(date) {
    /* ... (keep existing formatDate) ... */ //
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`;

    const options = { year: "numeric", month: "short", day: "numeric" };
    return date.toLocaleDateString(undefined, options);
  }

  function updateNotesCount(count) {
    /* ... (keep existing updateNotesCount) ... */ //
    if (notesCount)
      notesCount.textContent = count === 1 ? "1 note" : `${count} notes`;
  }

  // Handle form submission (create or update note)
  async function handleSubmit(event) {
    //
    event.preventDefault();
    const token = getToken();
    if (!token) {
      showToast("You must be logged in to save notes.", true);
      return;
    }

    const submitBtn = document.getElementById("submit-btn");
    const originalBtnContent = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i> Saving...';
    submitBtn.disabled = true;

    const title = document.getElementById("title").value;
    const content = document.getElementById("content").value;
    const tagsInput = document.getElementById("tags").value;
    const tags = tagsInput
      ? tagsInput
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag)
      : [];
    const noteData = { title, content, tags };

    try {
      let url = `${BASE_URL}/api/notes`;
      let method = "POST";

      if (currentNoteId) {
        url = `${BASE_URL}/api/notes/${currentNoteId}`;
        method = "PUT";
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`, // Add token
        },
        body: JSON.stringify(noteData),
      });

      if (response.status === 401 || response.status === 403) {
        showToast("Session expired or invalid. Please log in again.", true);
        removeToken();
        updateUIForAuthState();
        return;
      }

      const data = await response.json();
      if (data.success) {
        showToast(
          currentNoteId
            ? "Note updated successfully!"
            : "Note created successfully!"
        );
        resetForm();
        fetchNotes();
      } else {
        console.error("Failed to save note:", data.message);
        showToast(`Failed: ${data.message}`, true);
      }
    } catch (error) {
      console.error("Error saving note:", error);
      showToast("Error saving note. Please try again.", true);
    } finally {
      submitBtn.innerHTML = originalBtnContent;
      submitBtn.disabled = false;
    }
  }

  // Handle edit note
  async function handleEditNote(event) {
    //
    const token = getToken();
    if (!token) {
      showToast("You must be logged in to edit notes.", true);
      return;
    }
    const noteId = event.target.closest("button").dataset.id;

    try {
      const response = await fetch(`${BASE_URL}/api/notes/${noteId}`, {
        headers: { Authorization: `Bearer ${token}` }, // Add token
      });

      if (response.status === 401 || response.status === 403) {
        showToast("Session expired or invalid. Please log in again.", true);
        removeToken();
        updateUIForAuthState();
        return;
      }

      const data = await response.json();
      if (data.success) {
        const note = data.data;
        document.getElementById("title").value = note.title;
        document.getElementById("content").value = note.content;
        document.getElementById("tags").value = note.tags.join(", ");
        document.getElementById("submit-btn").innerHTML =
          '<i class="fas fa-save mr-2"></i><span>Update Note</span>';
        currentNoteId = noteId;
        if (noteForm) noteForm.scrollIntoView({ behavior: "smooth" });
      } else {
        showToast(data.message || "Error fetching note for edit.", true);
      }
    } catch (error) {
      console.error("Error fetching note for edit:", error);
      showToast("Error fetching note for edit. Please try again.", true);
    }
  }

  // Handle delete note (add token to request)
  async function handleDeleteNote(event) {
    //
    const token = getToken();
    if (!token) {
      showToast("You must be logged in to delete notes.", true);
      return;
    }

    const noteElement = event.target.closest("div[data-id]");
    const noteId = event.target.closest("button").dataset.id;

    // Confirmation Modal (keep existing modal logic)
    const modal = document.createElement("div");
    modal.className = "fixed inset-0 z-10 overflow-y-auto";
    // ... (rest of your modal HTML from original script.js) ...
    modal.innerHTML = `
        <div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div class="fixed inset-0 transition-opacity" aria-hidden="true">
            <div class="absolute inset-0 bg-gray-500 opacity-75"></div>
          </div>
          <div class="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div class="sm:flex sm:items-start">
                <div class="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                  <i class="fas fa-exclamation-triangle text-red-600"></i>
                </div>
                <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 class="text-lg leading-6 font-medium text-gray-900">Delete Note</h3>
                  <div class="mt-2">
                    <p class="text-sm text-gray-500">Are you sure you want to delete this note? This action cannot be undone.</p>
                  </div>
                </div>
              </div>
            </div>
            <div class="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button type="button" id="confirm-delete" class="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm">
                Delete
              </button>
              <button type="button" id="cancel-delete" class="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
                Cancel
              </button>
            </div>
          </div>
        </div>
      `;
    document.body.appendChild(modal);

    document.getElementById("cancel-delete").addEventListener("click", () => {
      document.body.removeChild(modal);
    });

    document
      .getElementById("confirm-delete")
      .addEventListener("click", async () => {
        document.body.removeChild(modal);
        if (noteElement)
          noteElement.innerHTML = `<div class="p-6 text-center text-gray-400"><i class="fas fa-spinner fa-spin"></i> Deleting...</div>`;

        try {
          const response = await fetch(`${BASE_URL}/api/notes/${noteId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` }, // Add token
          });

          if (response.status === 401 || response.status === 403) {
            showToast("Session expired or invalid. Please log in again.", true);
            removeToken();
            updateUIForAuthState();
            return;
          }

          const data = await response.json();
          if (data.success) {
            showToast("Note deleted successfully!");
            fetchNotes();
            if (currentNoteId === noteId) {
              resetForm();
            }
          } else {
            console.error("Failed to delete note:", data.message);
            showToast(`Failed to delete note: ${data.message}`, true);
            fetchNotes();
          }
        } catch (error) {
          console.error("Error deleting note:", error);
          showToast("Error deleting note. Please try again.", true);
          fetchNotes();
        }
      });
  }

  // Show toast notification (keep existing showToast)
  function showToast(message, isError = false) {
    /* ... */ //
    const toast = document.createElement("div");
    toast.className = `fixed bottom-4 right-4 px-4 py-2 rounded-lg shadow-lg z-50 transition-opacity duration-500 ${
      isError ? "bg-red-500" : "bg-green-500"
    } text-white`;
    toast.innerHTML = `
        <div class="flex items-center">
          <i class="fas ${
            isError ? "fa-exclamation-circle" : "fa-check-circle"
          } mr-2"></i>
          <span>${message}</span>
        </div>
      `;

    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "1";
    }, 10);
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => {
        if (toast.parentNode) document.body.removeChild(toast);
      }, 500);
    }, 3000);
  }

  // Reset form (keep existing resetForm)
  function resetForm() {
    //
    if (noteForm) noteForm.reset();
    if (document.getElementById("submit-btn")) {
      document.getElementById("submit-btn").innerHTML =
        '<i class="fas fa-save mr-2"></i><span>Save Note</span>';
    }
    currentNoteId = null;
  }

  // Add event listeners for note form if it exists
  if (noteForm) {
    noteForm.addEventListener("submit", handleSubmit);
  }

  // Initial UI setup
  updateUIForAuthState();
});
