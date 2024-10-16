document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const resultDiv = document.getElementById('result');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        resultDiv.textContent = 'Giriş yapılıyor...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                resultDiv.textContent = 'Giriş başarılı! Yönlendiriliyorsunuz...';
                resultDiv.style.color = 'green';
                localStorage.setItem('token', data.token);
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                resultDiv.textContent = `Hata: ${data.message}`;
                resultDiv.style.color = 'red';
            }
        } catch (error) {
            resultDiv.textContent = `Bağlantı hatası: ${error.message}`;
            resultDiv.style.color = 'red';
            console.error('Fetch hatası:', error);
        }
    });
});