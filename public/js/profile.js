/**
 * CraftConnect — Profile & Device Photo Upload Controller
 * Handles client-side device photo selection, live preview, base64 conversion,
 * immediate DOM updates (profile & sidebar avatar), localStorage persistence,
 * and backend synchronization with /api/profile/avatar.
 */

let selectedPhotoDataUrl = null;

function openPhotoUploadModal() {
    const modal = document.getElementById("photoUploadModal");
    if (!modal) return;

    const previewImg = document.getElementById("photoUploadPreviewImg");
    const placeholder = document.getElementById("photoUploadPlaceholder");
    const saveBtn = document.getElementById("photoUploadSaveBtn");
    const removeBtn = document.getElementById("photoUploadRemoveBtn");
    const fileInput = document.getElementById("photoUploadInput");

    if (fileInput) fileInput.value = "";
    selectedPhotoDataUrl = null;

    // Check if user currently has an active avatar
    let currentAvatar = null;
    const currentImg = document.getElementById("profileAvatarImg");
    if (currentImg && currentImg.src && !currentImg.src.includes("sitadevi.png")) {
        currentAvatar = currentImg.src;
    } else if (window.CC_USER && window.CC_USER.avatar) {
        currentAvatar = window.CC_USER.avatar;
    } else {
        const localSaved = localStorage.getItem("cc_user_avatar");
        if (localSaved) currentAvatar = localSaved;
    }

    if (currentAvatar) {
        if (previewImg) {
            previewImg.src = currentAvatar;
            previewImg.style.display = "block";
        }
        if (placeholder) placeholder.style.display = "none";
        if (removeBtn) removeBtn.style.display = "block";
        if (saveBtn) saveBtn.disabled = true; // disabled until a new photo is chosen
    } else {
        if (previewImg) {
            previewImg.src = "";
            previewImg.style.display = "none";
        }
        if (placeholder) placeholder.style.display = "block";
        if (removeBtn) removeBtn.style.display = "none";
        if (saveBtn) saveBtn.disabled = true;
    }

    modal.style.display = "flex";
}

function closePhotoUploadModal() {
    const modal = document.getElementById("photoUploadModal");
    if (modal) modal.style.display = "none";
    selectedPhotoDataUrl = null;
}

function handleProfilePhotoSelect(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    // Validate image mime type
    if (!file.type.startsWith("image/")) {
        alert("Please select a valid image file (JPG, PNG, or WebP).");
        return;
    }

    // Validate size (max 5 MB)
    if (file.size > 5 * 1024 * 1024) {
        alert("Selected image exceeds 5 MB. Please choose a smaller image.");
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        selectedPhotoDataUrl = e.target.result;
        const previewImg = document.getElementById("photoUploadPreviewImg");
        const placeholder = document.getElementById("photoUploadPlaceholder");
        const saveBtn = document.getElementById("photoUploadSaveBtn");
        const removeBtn = document.getElementById("photoUploadRemoveBtn");

        if (previewImg) {
            previewImg.src = selectedPhotoDataUrl;
            previewImg.style.display = "block";
        }
        if (placeholder) placeholder.style.display = "none";
        if (saveBtn) saveBtn.disabled = false;
        if (removeBtn) removeBtn.style.display = "block";
    };
    reader.readAsDataURL(file);
}

// Drag & drop support for preview area
document.addEventListener("DOMContentLoaded", function () {
    const dropArea = document.getElementById("photoUploadPreviewArea");
    if (dropArea) {
        ["dragenter", "dragover"].forEach(eventName => {
            dropArea.addEventListener(eventName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                dropArea.style.borderColor = "#10b981";
                dropArea.style.backgroundColor = "#e8f5e9";
            }, false);
        });

        ["dragleave", "drop"].forEach(eventName => {
            dropArea.addEventListener(eventName, function (e) {
                e.preventDefault();
                e.stopPropagation();
                dropArea.style.borderColor = "#0F5147";
                dropArea.style.backgroundColor = "#f7faf8";
            }, false);
        });

        dropArea.addEventListener("drop", function (e) {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files && files[0]) {
                handleProfilePhotoSelect({ target: { files } });
            }
        }, false);
    }

    // Sync saved avatar on page load
    initSavedAvatar();
});

async function saveProfilePhoto() {
    if (!selectedPhotoDataUrl) return;

    const dataUrl = selectedPhotoDataUrl;

    // 1. Update Profile Avatar DOM Element
    applyAvatarToDOM(dataUrl);

    // 2. Persist locally in localStorage
    try {
        localStorage.setItem("cc_user_avatar", dataUrl);
    } catch (e) {
        console.warn("Storage quota limit reached for local avatar:", e);
    }

    // 3. Update in-memory session user
    if (window.CC_USER) {
        window.CC_USER.avatar = dataUrl;
    }

    // 4. Update Edit button label
    const editLabel = document.getElementById("profilePhotoEditLabel");
    if (editLabel) editLabel.textContent = "Change Photo";

    // 5. Send to backend API
    try {
        fetch("/api/profile/avatar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ avatar: dataUrl })
        }).catch(err => console.warn("Backend avatar sync notice:", err));
    } catch (e) { }

    // 6. Notify user
    showProfileToast("✅ Profile photo updated successfully!");

    // 7. Close Modal
    closePhotoUploadModal();
}

async function removeProfilePhoto() {
    // 1. Clear from localStorage
    localStorage.removeItem("cc_user_avatar");

    // 2. Reset in-memory session user
    if (window.CC_USER) {
        window.CC_USER.avatar = null;
    }

    // 3. Revert Profile Avatar DOM element to initials or default avatar
    revertAvatarInDOM();

    // 4. Update Edit button label
    const editLabel = document.getElementById("profilePhotoEditLabel");
    if (editLabel) editLabel.textContent = "Upload Photo";

    // 5. Send removal request to backend API
    try {
        fetch("/api/profile/avatar", {
            method: "DELETE"
        }).catch(err => console.warn("Backend avatar removal notice:", err));
    } catch (e) { }

    showProfileToast("🗑️ Profile photo removed.");
    closePhotoUploadModal();
}

function applyAvatarToDOM(avatarUrl) {
    const wrapper = document.getElementById("profileAvatarWrapper");
    if (wrapper) {
        wrapper.className = "profile-avatar-wrapper profile-avatar--user";
        wrapper.innerHTML = `
            <img class="avatar" id="profileAvatarImg" src="${avatarUrl}" alt="Artisan Profile">
            <div class="profile-avatar-overlay">
                <span class="profile-avatar-overlay-icon">📷</span>
                <span class="profile-avatar-overlay-text">Change</span>
            </div>
        `;
    }

    // Also update the sidebar avatar
    const sidebarAvatar = document.getElementById("sidebarAvatar");
    if (sidebarAvatar) {
        sidebarAvatar.src = avatarUrl;
    }
}

function revertAvatarInDOM() {
    const wrapper = document.getElementById("profileAvatarWrapper");
    const user = window.CC_USER;

    if (wrapper) {
        if (user && user.name) {
            const initials = user.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
            wrapper.className = "profile-avatar-wrapper profile-avatar--user profile-avatar--initials";
            wrapper.innerHTML = `
                <div class="avatar avatar-initials" id="profileAvatarInitials">${initials}</div>
                <div class="profile-avatar-overlay">
                    <span class="profile-avatar-overlay-icon">📷</span>
                    <span class="profile-avatar-overlay-text">Upload</span>
                </div>
            `;
        } else {
            wrapper.className = "profile-avatar-wrapper profile-avatar--guest";
            wrapper.innerHTML = `
                <img class="avatar" id="profileAvatarImg" src="/images/default_avatar.png" alt="Guest Artisan Profile">
                <div class="profile-avatar-overlay">
                    <span class="profile-avatar-overlay-icon">📷</span>
                    <span class="profile-avatar-overlay-text">Change</span>
                </div>
            `;
        }
    }

    const sidebarAvatar = document.getElementById("sidebarAvatar");
    if (sidebarAvatar && (!window.CC_USER || !window.CC_USER.avatar)) {
        sidebarAvatar.src = "/images/default_avatar.png";
    }
}

function initSavedAvatar() {
    const saved = localStorage.getItem("cc_user_avatar");
    if (saved) {
        applyAvatarToDOM(saved);
        const editLabel = document.getElementById("profilePhotoEditLabel");
        if (editLabel) editLabel.textContent = "Change Photo";
    }
}

function showProfileToast(message) {
    const existing = document.getElementById("ccProfileToast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "ccProfileToast";
    toast.style.cssText = "position: fixed; bottom: 30px; right: 30px; background: #0F5147; color: white; padding: 12px 20px; border-radius: 12px; font-weight: 600; font-size: 13.5px; box-shadow: 0 10px 25px rgba(0,0,0,0.2); z-index: 99999; display: flex; align-items: center; gap: 8px; animation: fadeInMenu 0.25s ease-out;";
    toast.innerHTML = `<span>${message}</span>`;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = "0";
        toast.style.transition = "opacity 0.3s ease";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
