// OAuth2.0 authentication for Podio
fetch('https://podio.com/oauth/token', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
        'client_id': 'cls-integration',
        'client_secret': 'bDXxvbXoG5v1M1yOJx6wsLZVQPsy4kyWTYLWNe3gx0XTvU7cbOVYYFh9YvZ71hiY',
        'grant_type': 'client_credentials',
    }),
})
.then(response => response.json())
.then(data => {
    console.log(data.access_token); // This is your access token
})
.catch(err => {
    console.error('Error:', err);
});
