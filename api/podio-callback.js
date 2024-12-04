export default async function handler(req, res) {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send("Missing authorization code");
    }

    // Exchange the authorization code for an access token
    const response = await fetch("https://podio.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            client_id: process.env.PODIO_CLIENT_ID,
            client_secret: process.env.PODIO_CLIENT_SECRET,
            code: code,
            redirect_uri: "https://carolina-lumpers.vercel.app/api/podio-callback",
            grant_type: "authorization_code",
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        return res.status(500).send(`Error exchanging token: ${error}`);
    }

    const data = await response.json();
    res.status(200).json(data); // You can save the token to a database here
}
