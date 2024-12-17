document.addEventListener('DOMContentLoaded', () => {
    const postForm = document.getElementById('postForm');
    const postsContainer = document.getElementById('posts');
    const usernameSpan = document.getElementById('username');
    const logoutButton = document.getElementById('logoutButton');
    const loginButton = document.getElementById('loginButton');
    const registerButton = document.getElementById('registerButton');
    const redirectLoginButton = document.getElementById('redirectLogin');
    const mainContent = document.getElementById('mainContent');
    const notLoggedInSection = document.getElementById('notLoggedIn');
    const authButtons = document.getElementById('authButtons');
    
    checkAuthStatus();
    
    function checkAuthStatus() {
        const token = localStorage.getItem('token');
    
        if (token) {
            loadUserInfo(); 
            loadPosts(); 
    
            if (mainContent) mainContent.style.display = 'block';
            if (notLoggedInSection) notLoggedInSection.style.display = 'none';
            if (logoutButton) logoutButton.style.display = 'block';
            if (loginButton) loginButton.style.display = 'none';
            if (registerButton) registerButton.style.display = 'none';
        } else {
            if (mainContent) mainContent.style.display = 'none';
            if (notLoggedInSection) notLoggedInSection.style.display = 'block';
            if (logoutButton) logoutButton.style.display = 'none';
            if (loginButton) loginButton.style.display = 'block';
            if (registerButton) registerButton.style.display = 'block';
        }
    }
    
    if (logoutButton) {
        logoutButton.addEventListener('click', logout);
    }
    if (loginButton) {
        loginButton.addEventListener('click', () => {
            window.location.href = '/login.html'; 
        });
    }
    if (registerButton) {
        registerButton.addEventListener('click', () => {
            window.location.href = '/register.html'; 
        });
    }
    if (redirectLoginButton) {
        redirectLoginButton.addEventListener('click', () => {
            window.location.href = '/login.html'; 
        });
    }

    if (postForm) {
        postForm.addEventListener('submit', createPost);
    }

    
    function loadUserInfo() {
        const token = localStorage.getItem('token');
        if (token) {
            fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })
            .then(response => response.json())
            .then(user => {
                usernameSpan.textContent = user.username;
            })
            .catch(error => {
                console.error('Error:', error);
                logout(); 
            });
        }
    }

    function logout() {
        localStorage.removeItem('token');
        checkAuthStatus(); 
    }

    async function loadPosts() {
        try {
            const response = await fetch('/api/posts');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const posts = await response.json();
            displayPosts(posts);
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function donateToPost(postId) {
        const token = localStorage.getItem('token');
        if (!token) {
            alert('Lütfen giriş yapın');
            return;
        }
    
        const donationAmount = prompt('Bağış miktarını ETH cinsinden girin:');
        if (!donationAmount || isNaN(donationAmount)) {
            alert('Geçerli bir miktar girin');
            return;
        }
    
        try {
            if (typeof window.ethereum === 'undefined') {
                alert('Metamask kurulu değil. Lütfen Metamask uzantısını yükleyin.');
                return;
            }
    
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            const senderAddress = accounts[0];
    
            const userResponse = await fetch('/api/user', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const currentUser = await userResponse.json();
    
            const postResponse = await fetch(`/api/posts/${postId}`);
            const post = await postResponse.json();
    
            if (!post.userId.walletAddress) {
                alert('Bu gönderi sahibinin cüzdan adresi bulunmuyor.');
                return;
            }
    
            const amountInWei = BigInt(Math.round(parseFloat(donationAmount) * 1e18));
    
            const transactionParameters = {
                from: senderAddress,
                to: post.userId.walletAddress,
                value: `0x${amountInWei.toString(16)}`
            };
    
            const txHash = await window.ethereum.request({
                method: 'eth_sendTransaction',
                params: [transactionParameters]
            });
    
            const donationResponse = await fetch(`/api/posts/${postId}/donate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    amount: donationAmount, 
                    transactionHash: txHash,
                    senderAddress: senderAddress,
                    recipientAddress: post.userId.walletAddress
                })
            });
    
            if (!donationResponse.ok) {
                throw new Error(`Bağış kaydetme hatası: ${donationResponse.status}`);
            }
    
            alert(`${donationAmount} ETH başarıyla transfer edildi!`);
            await loadPosts();
    
        } catch (error) {
            console.error('Bağış hatası:', error);
            alert('Bağış işlemi sırasında bir hata oluştu: ' + error.message);
        }
    }
    
    

    
    function displayPosts(posts) {
        const postsContainer = document.getElementById('postsContainer');
        postsContainer.innerHTML = '';
        posts.forEach(post => {
            const postElement = document.createElement('div');
            postElement.classList.add('post');
            postElement.innerHTML = `
                <div class="post-header">
                    <span class="post-username">${post.userId ? post.userId.username : 'Anonim'}</span>
                    <span class="post-date">${new Date(post.createdAt).toLocaleString()}</span>
                </div>
                <p class="post-content">${post.content}</p>
                <div class="post-actions">
                    <button class="like-button" data-post-id="${post._id}">Beğen (${post.likes ? post.likes.length : 0})</button>
                    <button class="comment-button" data-post-id="${post._id}">Bağış</button>
                </div>
                <div class="comments">
                    ${post.comments ? post.comments.map(comment => `
                        <div class="comment">
                            <strong>${comment.userId ? comment.userId.username : 'Anonim'}</strong>: ${comment.content}
                        </div>
                    `).join('') : ''}
                </div>
                <form class="comment-form" data-post-id="${post._id}">
                    <input type="text" placeholder="Yorum yaz" required>
                    <button type="submit">Gönder</button>
                    <div class="comment-status"></div>
                </form>
            `;
            
            postsContainer.appendChild(postElement);
        });
    
        document.querySelectorAll('.like-button').forEach(button => {
            button.addEventListener('click', () => likePost(button.dataset.postId));
        });
    
        document.querySelectorAll('.comment-form').forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const postId = form.dataset.postId;
                const input = form.querySelector('input');
                const content = input.value;
                const statusDiv = form.querySelector('.comment-status');
                
                // Disable form while submitting
                const submitButton = form.querySelector('button');
                submitButton.disabled = true;
                input.disabled = true;
                
                try {
                    await addComment(postId, content);
                    form.reset();
                    statusDiv.textContent = 'Yorum başarıyla eklendi!';
                    statusDiv.style.color = 'green';
                    setTimeout(() => {
                        statusDiv.textContent = '';
                    }, 3000);
                } catch (error) {
                    statusDiv.textContent = error.message;
                    statusDiv.style.color = 'red';
                } finally {
                    // Re-enable form
                    submitButton.disabled = false;
                    input.disabled = false;
                }
            }); 
        });
    
        document.querySelectorAll('.comment-button').forEach(button => {
            button.addEventListener('click', () => {
                const postId = button.dataset.postId;
                donateToPost(postId);
            });
        });
        
    }
    

    async function createPost(e) {
        e.preventDefault();
        const content = document.getElementById('postContent').value;
        const token = localStorage.getItem('token');
    
        if (!token) {
            return;
        }
    
        try {
            const response = await fetch('/api/posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
    
            document.getElementById('postContent').value = '';
            await loadPosts();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function likePost(postId) {
        const token = localStorage.getItem('token');
        if (!token) {
            return;
        }

        try {
            const response = await fetch(`/api/posts/${postId}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            await loadPosts();
        } catch (error) {
            console.error('Error:', error);
        }
    }

    async function addComment(postId, content) {
        const token = localStorage.getItem('token');
        if (!token) {
            throw new Error('Lütfen giriş yapın');
        }
    
        try {
            const response = await fetch(`/api/posts/${postId}/comment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ content })
            });
    
            if (!response.ok) {
                const errorData = await response.json();
                
                if (response.status === 500 && errorData.message.includes('Argo kontrolü servisi')) {
                    throw new Error('Yorum sistemi geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
                }
                
                throw new Error(errorData.message || 'Yorum ekleme hatası');
            }
    
            await loadPosts();
        } catch (error) {
            console.error('Error:', error);
            throw error; 
        }
    }

    function openUserEditModal() {
        document.getElementById('userEditModal').style.display = 'block';
        
        fetch('/api/user/current')
            .then(response => response.json())
            .then(data => {
                document.getElementById('newUsername').value = data.username || '';
                document.getElementById('walletAddress').value = data.wallet || '';
            });
    }
    
    function closeModal() {
        document.getElementById('userEditModal').style.display = 'none';
    }
    
    function saveUserData() {
        const username = document.getElementById('newUsername').value;
        const wallet = document.getElementById('walletAddress').value;
    
        fetch('/api/user/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, wallet })
        }).then(response => {
            if (response.ok) {
                alert('Bilgiler başarıyla güncellendi!');
                closeModal();
                document.getElementById('username').innerText = username;
            } else {
                alert('Güncelleme sırasında hata oluştu!');
            }
        });
    }
    
});
