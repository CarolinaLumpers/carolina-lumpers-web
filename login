<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - Carolina Lumpers</title>
    <link rel="stylesheet" href="styles.css">
</head>

<body>
    <div class="login-container">
        <section>
            <h2>Login to Your Account</h2>
            <form action="/login" method="POST">
                <!-- Username Field -->
                <div class="form-group">
                    <label for="username">Username</label>
                    <input type="text" id="username" name="username" placeholder="Enter your username" required>
                </div>
                <!-- Password Field -->
                <div class="form-group">
                    <label for="password">Password</label>
                    <input type="password" id="password" name="password" placeholder="Enter your password" required>
                </div>
                <!-- Login Button -->
                <button type="submit">Login</button>
            </form>
        </section>
    </div>
</body>

</html>
