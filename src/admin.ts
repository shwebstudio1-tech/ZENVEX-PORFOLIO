import {
  fetchProjects,
  addProject,
  updateProject,
  toggleProject,
  deleteProject,
  fetchOffers,
  addOffer,
  toggleOffer,
  deleteOffer,
  fetchSiteSettings,
  saveSiteSettings,
  fetchReviews,
  reviewAction,
  fetchMessages
} from './firebase';

function esc(s: any): string {
  return String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c] || c));
}

let currentProjectsList: any[] = [];

// API Helper for Backend Routes (Image Uploads)
async function api(url: string, options: any = {}) {
  const token = localStorage.getItem('zenvex_admin_token') || '';
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token,
    ...(options.headers || {})
  };

  const r = await fetch(url, { credentials: 'same-origin', ...options, headers });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || ('Request failed (' + r.status + ')'));
  return d;
}

// Tab Navigation
document.querySelectorAll('.admin-tab').forEach(tabBtn => {
  tabBtn.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach((c: any) => c.hidden = true);
    tabBtn.classList.add('active');
    const target = tabBtn.getAttribute('data-tab');
    if (target && document.getElementById(target)) {
      (document.getElementById(target) as HTMLElement).hidden = false;
    }
  });
});

// Image Upload Listeners
const imageFileInput = document.getElementById('imageFileInput') as HTMLInputElement | null;
if (imageFileInput) {
  imageFileInput.addEventListener('change', async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;

    const statusEl = document.getElementById('uploadStatusText');
    const previewDiv = document.getElementById('uploadPreview');
    const previewImg = document.getElementById('previewImg') as HTMLImageElement | null;
    const urlInput = document.getElementById('imageUrlInput') as HTMLInputElement | null;

    if (previewDiv) previewDiv.style.display = 'flex';
    if (statusEl) statusEl.textContent = 'Uploading image...';

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result;
        const res = await api('/api/admin/upload-image', {
          method: 'POST',
          body: JSON.stringify({ dataUrl, filename: file.name })
        });
        if (urlInput) urlInput.value = res.url;
        if (previewImg) previewImg.src = res.url;
        if (statusEl) statusEl.textContent = '✓ Uploaded: ' + file.name;
      } catch (err: any) {
        if (statusEl) statusEl.textContent = '❌ Upload failed: ' + err.message;
      }
    };
    reader.readAsDataURL(file);
  });
}

const editImageFileInput = document.getElementById('editImageFileInput') as HTMLInputElement | null;
if (editImageFileInput) {
  editImageFileInput.addEventListener('change', async (e: any) => {
    const file = e.target.files[0];
    if (!file) return;
    const urlInput = document.getElementById('editProjectImageUrl') as HTMLInputElement | null;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dataUrl = reader.result;
        const res = await api('/api/admin/upload-image', {
          method: 'POST',
          body: JSON.stringify({ dataUrl, filename: file.name })
        });
        if (urlInput) urlInput.value = res.url;
      } catch (err: any) {
        alert('Upload failed: ' + err.message);
      }
    };
    reader.readAsDataURL(file);
  });
}

// Load All Dashboard Data from Firebase Firestore
async function loadAll() {
  const projEl = document.getElementById('projectsList');
  try {
    console.log('Loading all dashboard data...');
    const [reviews, messages, projects, offers, settings] = await Promise.all([
      fetchReviews(false),
      fetchMessages(),
      fetchProjects(false),
      fetchOffers(false),
      fetchSiteSettings()
    ]);

    currentProjectsList = projects || [];
    console.log('Dashboard data loaded successfully.');

    // Summary Counts
    const countInquiries = document.getElementById('countInquiries');
    if (countInquiries) countInquiries.textContent = (messages.length || 0).toString();

    const countReviews = document.getElementById('countReviews');
    if (countReviews) countReviews.textContent = (reviews.filter((r: any) => !r.approved).length || 0).toString();

    const countProjects = document.getElementById('countProjects');
    if (countProjects) countProjects.textContent = (projects.filter((p: any) => p.is_active).length || 0).toString();

    const countOffers = document.getElementById('countOffers');
    if (countOffers) countOffers.textContent = (offers.filter((o: any) => o.is_active).length || 0).toString();

    // Render Projects
    const projEl = document.getElementById('projectsList');
    if (projEl) {
      if (!projects.length) {
        projEl.innerHTML = '<p style="color:var(--muted)">No projects created in database yet.</p>';
      } else {
        projEl.innerHTML = projects.map(p => `
          <div class="admin-item">
            ${p.image_url ? `<img src="${esc(p.image_url)}" alt="Thumbnail" style="width:70px;height:70px;object-fit:cover;border-radius:8px;border:1px solid var(--line);">` : ''}
            <div class="admin-item-content">
              <span class="badge ${p.is_active ? 'active' : 'inactive'}">${p.is_active ? 'ACTIVE' : 'DRAFT'}</span>
              <span class="badge">${esc(p.category)}</span>
              <b>${esc(p.title)}</b>
              <p>${esc(p.description || 'No description provided.')}</p>
              <small style="color:var(--muted)">Link: ${esc(p.link_url)} | Theme: ${esc(p.visual_theme)}${p.image_url ? ` | Custom Image` : ''}</small>
            </div>
            <div class="admin-actions">
              <button class="primary" data-edit-id="${p.id}">Edit ✏️</button>
              <button data-toggle-id="${p.id}">${p.is_active ? 'Disable' : 'Enable'}</button>
              <button class="danger" data-delete-id="${p.id}">Delete</button>
            </div>
          </div>
        `).join('');

        // Attach action listeners
        projEl.querySelectorAll('[data-edit-id]').forEach(btn => {
          btn.addEventListener('click', () => {
            const id = btn.getAttribute('data-edit-id');
            if (id) openEditProjectModal(id);
          });
        });
        projEl.querySelectorAll('[data-toggle-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-toggle-id');
            if (id) {
              await toggleProject(id);
              await loadAll();
            }
          });
        });
        projEl.querySelectorAll('[data-delete-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-delete-id');
            if (id && confirm('Are you sure you want to delete this project permanently?')) {
              await deleteProject(id);
              await loadAll();
            }
          });
        });
      }
    }

    // Render Offers
    const offerEl = document.getElementById('offersList');
    if (offerEl) {
      if (!offers.length) {
        offerEl.innerHTML = '<p style="color:var(--muted)">No promotional offers active.</p>';
      } else {
        offerEl.innerHTML = offers.map(o => `
          <div class="admin-item">
            <div class="admin-item-content">
              <span class="badge ${o.is_active ? 'active' : 'inactive'}">${o.is_active ? 'LIVE OFFER' : 'PAUSED'}</span>
              <span class="badge">${esc(o.highlight_badge)}</span>
              <b>${esc(o.title)}</b>
              <p>${esc(o.description)}</p>
              <small style="color:var(--muted)">Discount: ${esc(o.discount_tag)} | CTA: ${esc(o.cta_text)}</small>
            </div>
            <div class="admin-actions">
              <button data-toggle-offer-id="${o.id}">${o.is_active ? 'Pause Offer' : 'Activate Offer'}</button>
              <button class="danger" data-delete-offer-id="${o.id}">Delete</button>
            </div>
          </div>
        `).join('');

        offerEl.querySelectorAll('[data-toggle-offer-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-toggle-offer-id');
            if (id) {
              await toggleOffer(id);
              await loadAll();
            }
          });
        });

        offerEl.querySelectorAll('[data-delete-offer-id]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-delete-offer-id');
            if (id && confirm('Are you sure you want to delete this offer?')) {
              await deleteOffer(id);
              await loadAll();
            }
          });
        });
      }
    }

    // Populate Settings Form
    const setForm = document.getElementById('settingsForm') as HTMLFormElement | null;
    if (setForm) {
      if (settings.hero_h1) (setForm.elements as any)['hero_h1'].value = settings.hero_h1;
      if (settings.hero_lede) (setForm.elements as any)['hero_lede'].value = settings.hero_lede;
      if (settings.stat_satisfaction) (setForm.elements as any)['stat_satisfaction'].value = settings.stat_satisfaction;
      if (settings.stat_delivered) (setForm.elements as any)['stat_delivered'].value = settings.stat_delivered;
      if (settings.stat_roi) (setForm.elements as any)['stat_roi'].value = settings.stat_roi;
      if (settings.stat_global) (setForm.elements as any)['stat_global'].value = settings.stat_global;
      if (settings.phone_number) (setForm.elements as any)['phone_number'].value = settings.phone_number;
      if (settings.email_address) (setForm.elements as any)['email_address'].value = settings.email_address;
      if (settings.google_site_verification) (setForm.elements as any)['google_site_verification'].value = settings.google_site_verification;
    }

    // Render Reviews
    const revEl = document.getElementById('reviewsList');
    if (revEl) {
      if (!reviews.length) {
        revEl.innerHTML = '<p style="color:var(--muted)">No reviews submitted yet.</p>';
      } else {
        revEl.innerHTML = reviews.map(r => `
          <div class="admin-item">
            <div class="admin-item-content">
              <span class="badge ${r.approved ? 'active' : 'inactive'}">${r.approved ? 'APPROVED' : 'PENDING'}</span>
              <b>${esc(r.name)} · ${'★'.repeat(r.rating)}</b>
              <p>${esc(r.company ? r.company + ' — ' : '')}${esc(r.message)}</p>
              <small style="color:var(--muted)">${esc(r.created_at)}</small>
            </div>
            <div class="admin-actions">
              <button class="approve" data-review-act="approve" data-review-id="${r.id}">Approve</button>
              <button data-review-act="reject" data-review-id="${r.id}">Unpublish</button>
              <button class="danger" data-review-act="delete" data-review-id="${r.id}">Delete</button>
            </div>
          </div>
        `).join('');

        revEl.querySelectorAll('[data-review-act]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-review-id');
            const act = btn.getAttribute('data-review-act') as 'approve' | 'reject' | 'delete';
            if (id && act) {
              await reviewAction(id, act);
              await loadAll();
            }
          });
        });
      }
    }

    // Render Inquiries
    const msgEl = document.getElementById('messagesList');
    if (msgEl) {
      if (!messages.length) {
        msgEl.innerHTML = '<p style="color:var(--muted)">No inquiries received yet.</p>';
      } else {
        msgEl.innerHTML = messages.map(m => `
          <div class="admin-item">
            <div class="admin-item-content">
              <b>${esc(m.name)} · <a href="mailto:${esc(m.email)}">${esc(m.email)}</a></b>
              <p><strong>Service Needed:</strong> ${esc(m.project_type)}</p>
              <p style="background:#fff;padding:12px;border:1px solid #e1e6eb;border-radius:8px;">${esc(m.details)}</p>
              <small style="color:var(--muted)">Received: ${esc(m.created_at)}</small>
            </div>
          </div>
        `).join('');
      }
    }

  } catch (err: any) {
    console.error('Failed to load dashboard data:', err);
    if (projEl) {
      projEl.innerHTML = `<div style="padding:20px;background:#fff5f5;border:1px solid #feb2b2;color:#c53030;border-radius:10px;">
        <b>⚠️ Loading Error:</b> ${err.message || 'Firestore connection failed.'}
        <br><small>Please check your internet connection or Firebase setup.</small>
      </div>`;
    }
  }
}

// Edit Modal Helper
function openEditProjectModal(id: string) {
  const p = currentProjectsList.find(item => String(item.id) === String(id));
  if (!p) return;
  (document.getElementById('editProjectId') as HTMLInputElement).value = p.id;
  (document.getElementById('editProjectTitle') as HTMLInputElement).value = p.title || '';
  (document.getElementById('editProjectCategory') as HTMLInputElement).value = p.category || '';
  (document.getElementById('editProjectTypeBadge') as HTMLInputElement).value = p.type_badge || '';
  (document.getElementById('editProjectVisualTheme') as HTMLSelectElement).value = p.visual_theme || 'project-tech';
  (document.getElementById('editProjectLinkUrl') as HTMLInputElement).value = p.link_url || '#contact';
  (document.getElementById('editProjectImageUrl') as HTMLInputElement).value = p.image_url || '';
  (document.getElementById('editProjectDescription') as HTMLTextAreaElement).value = p.description || '';
  
  const status = document.getElementById('editProjectStatus');
  if (status) status.textContent = '';
  
  const dialog = document.getElementById('editProjectDialog') as HTMLDialogElement | null;
  if (dialog) dialog.showModal();
}

// Form Handlers
const addProjectForm = document.getElementById('addProjectForm') as HTMLFormElement | null;
if (addProjectForm) {
  addProjectForm.addEventListener('submit', async e => {
    e.preventDefault();
    const status = document.getElementById('addProjectStatus');
    if (status) status.textContent = 'Saving project to database...';
    try {
      const data = Object.fromEntries(new FormData(addProjectForm));
      await addProject(data);
      if (status) status.textContent = '✓ New project created in database!';
      addProjectForm.reset();
      const uploadPreview = document.getElementById('uploadPreview');
      if (uploadPreview) uploadPreview.style.display = 'none';
      await loadAll();
    } catch (err: any) {
      if (status) status.textContent = '❌ ' + (err.message || 'Failed to save project');
    }
  });
}

const editProjectForm = document.getElementById('editProjectForm') as HTMLFormElement | null;
if (editProjectForm) {
  editProjectForm.addEventListener('submit', async e => {
    e.preventDefault();
    const status = document.getElementById('editProjectStatus');
    if (status) {
      status.style.color = 'var(--muted)';
      status.textContent = 'Updating project in database...';
    }
    try {
      const pid = (document.getElementById('editProjectId') as HTMLInputElement).value;
      const data = Object.fromEntries(new FormData(editProjectForm));
      await updateProject(pid, data);
      if (status) {
        status.style.color = '#1e7e34';
        status.textContent = '✓ Project updated in database!';
      }
      setTimeout(() => {
        const dialog = document.getElementById('editProjectDialog') as HTMLDialogElement | null;
        if (dialog) dialog.close();
      }, 500);
      await loadAll();
    } catch (err: any) {
      if (status) {
        status.style.color = '#d92550';
        status.textContent = '❌ ' + (err.message || 'Failed to update project');
      }
    }
  });
}

const addOfferForm = document.getElementById('addOfferForm') as HTMLFormElement | null;
if (addOfferForm) {
  addOfferForm.addEventListener('submit', async e => {
    e.preventDefault();
    const status = document.getElementById('addOfferStatus');
    if (status) status.textContent = 'Saving offer to database...';
    try {
      const data = Object.fromEntries(new FormData(addOfferForm));
      await addOffer(data);
      if (status) status.textContent = '✓ New promotional offer added!';
      addOfferForm.reset();
      await loadAll();
    } catch (err: any) {
      if (status) status.textContent = '❌ ' + (err.message || 'Failed to save offer');
    }
  });
}

const settingsForm = document.getElementById('settingsForm') as HTMLFormElement | null;
if (settingsForm) {
  settingsForm.addEventListener('submit', async e => {
    e.preventDefault();
    const status = document.getElementById('settingsStatus');
    if (status) status.textContent = 'Saving site settings...';
    try {
      const data = Object.fromEntries(new FormData(settingsForm)) as Record<string, string>;
      await saveSiteSettings(data);
      if (status) status.textContent = '✓ Website settings saved!';
      await loadAll();
    } catch (err: any) {
      if (status) status.textContent = '❌ ' + (err.message || 'Failed to save settings');
    }
  });
}

const changePasswordForm = document.getElementById('changePasswordForm') as HTMLFormElement | null;
if (changePasswordForm) {
  changePasswordForm.addEventListener('submit', async e => {
    e.preventDefault();
    const status = document.getElementById('changePasswordStatus');
    if (status) {
      status.style.color = '#394653';
      status.textContent = 'Updating password...';
    }
    try {
      const formData = new FormData(changePasswordForm);
      const currentPwd = String(formData.get('currentPassword') || '').trim();
      const newPwd = String(formData.get('newPassword') || '').trim();

      if (!newPwd || newPwd.length < 4) {
        throw new Error('New password must be at least 4 characters long.');
      }

      const settings = await fetchSiteSettings();
      const storedPwd = settings.admin_password;

      if (storedPwd && currentPwd !== storedPwd) {
        throw new Error('Current password is incorrect.');
      }

      await saveSiteSettings({ admin_password: newPwd });
      localStorage.setItem('zenvex_admin_password', newPwd);

      if (status) {
        status.style.color = '#1e7e34';
        status.textContent = '✓ Password updated successfully!';
      }
      changePasswordForm.reset();
    } catch (err: any) {
      if (status) {
        status.style.color = '#d92550';
        status.textContent = '❌ ' + (err.message || 'Password change failed');
      }
    }
  });
}

// Authentication Sign In Handler
const loginForm = document.getElementById('loginForm') as HTMLFormElement | null;
if (loginForm) {
  loginForm.addEventListener('submit', async e => {
    e.preventDefault();
    const status = document.getElementById('loginStatus');
    if (status) {
      status.style.color = 'var(--muted)';
      status.textContent = 'Signing in...';
    }
    try {
      const pwd = String(new FormData(loginForm).get('password') || '').trim();
      const settings = await fetchSiteSettings();
      const storedPwd = settings.admin_password || localStorage.getItem('zenvex_admin_password');

      if (storedPwd) {
        if (pwd !== storedPwd) {
          throw new Error('Incorrect password.');
        }
      } else {
        // Set first entered password as the admin password in Firestore
        await saveSiteSettings({ admin_password: pwd });
        localStorage.setItem('zenvex_admin_password', pwd);
      }

      const token = 'zenvex_admin_valid_token';
      localStorage.setItem('zenvex_admin_token', token);

      const loginBox = document.getElementById('loginBox');
      const dashboard = document.getElementById('dashboard');
      const logoutBtn = document.getElementById('logoutBtn');

      if (loginBox) loginBox.hidden = true;
      if (dashboard) dashboard.hidden = false;
      if (logoutBtn) logoutBtn.style.display = 'inline-block';

      await loadAll();
    } catch (err: any) {
      if (status) {
        status.style.color = '#d92550';
        status.textContent = '❌ ' + (err.message || 'Incorrect password.');
      }
    }
  });
}

const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('zenvex_admin_token');
    location.reload();
  });
}

// Auto Check Login Session
async function checkAutoLogin() {
  const token = localStorage.getItem('zenvex_admin_token');
  const loginBox = document.getElementById('loginBox');
  const dashboard = document.getElementById('dashboard');
  const logoutBtn = document.getElementById('logoutBtn');

  if (!token) {
    if (loginBox) loginBox.hidden = false;
    if (dashboard) dashboard.hidden = true;
    if (logoutBtn) logoutBtn.style.display = 'none';
    return;
  }

  try {
    await loadAll();
    if (loginBox) loginBox.hidden = true;
    if (dashboard) dashboard.hidden = false;
    if (logoutBtn) logoutBtn.style.display = 'inline-block';
  } catch (e) {
    localStorage.removeItem('zenvex_admin_token');
    if (loginBox) loginBox.hidden = false;
    if (dashboard) dashboard.hidden = true;
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

checkAutoLogin();
