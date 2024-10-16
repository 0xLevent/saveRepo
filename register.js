document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    console.log('Form submit olayı tetiklendi');

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value.trim();
    const username = document.getElementById('username').value.trim();  // username input'unu ekleyin

    const resultDiv = document.getElementById('result');
    resultDiv.textContent = 'İstek gönderiliyor...';
    console.log('İstek gönderiliyor:', { email, password, username });

    try {
        const response = await fetch('http://localhost:5001/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password, username })  
        });

        console.log('Sunucu yanıtı alındı:', response);

        const data = await response.json();
        console.log('Sunucu yanıt verisi:', data);
        
        if (response.ok) {
            resultDiv.textContent = `Başarılı: ${data.message}`;
            resultDiv.style.color = 'green';
            setTimeout(() => {
                window.location.href = '/login';
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
