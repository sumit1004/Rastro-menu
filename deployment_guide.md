# Rastro-menu Production Deployment Guide

This document provides step-by-step instructions for deploying the Rastro-menu SaaS platform to production. We are using **Netlify** for the frontend, **Render** for the backend, and **Hostinger** for the MySQL database.

## 1. Hostinger MySQL Database Setup

1. Log into your Hostinger control panel.
2. Navigate to **Databases > MySQL Databases**.
3. Create a new database, user, and password. Save these credentials securely.
4. **Remote MySQL**: Navigate to the "Remote MySQL" section in Hostinger and allow your Render backend IP address (or `%` for all IPs if Render uses dynamic IPs, but be cautious with `%`).
5. Run the `schema.sql` file provided in the `backend` folder to initialize your tables. You can do this via phpMyAdmin in Hostinger.

## 2. Render Backend Deployment

1. Create an account on [Render.com](https://render.com).
2. Connect your GitHub/GitLab repository.
3. Create a new **Web Service**.
4. Configure the settings:
   - **Environment**: Node
   - **Build Command**: `npm install` (ensure your root directory is set to `backend` or use a monorepo setup)
   - **Start Command**: `npm start` (this runs `node server.js` as we updated in `package.json`)
5. Add the following **Environment Variables** in Render:
   - `PORT`: (Leave blank, Render assigns this automatically, or set to an internal port if needed)
   - `FRONTEND_URL`: `https://your-frontend-domain.netlify.app`
   - `DB_HOST`: Your Hostinger DB hostname
   - `DB_USER`: Your Hostinger DB username
   - `DB_PASSWORD`: Your Hostinger DB password
   - `DB_NAME`: Your Hostinger DB name
   - `JWT_SECRET`: A strong random string for authentication
   - `RAZORPAY_KEY_ID`: Your Razorpay Key ID
   - `RAZORPAY_KEY_SECRET`: Your Razorpay Key Secret

6. Deploy the service. Once deployed, note the generated `https://your-backend-app.onrender.com` URL.

## 3. Netlify Frontend Deployment

1. Create an account on [Netlify](https://www.netlify.com).
2. Click **Add new site > Import an existing project**.
3. Connect your repository.
4. Configure the build settings:
   - **Base directory**: `frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `frontend/dist` (or `build` depending on your Vite config)
5. Add the following **Environment Variables** in Netlify:
   - `VITE_API_BASE_URL`: The URL you got from Render (e.g., `https://your-backend-app.onrender.com/api`)
   - `VITE_RAZORPAY_KEY_ID`: Your Razorpay Key ID
6. Click **Deploy Site**.
7. Netlify will automatically use the `public/_redirects` file we created to ensure React Router works correctly on page reloads.

## 4. Final Testing

After both environments are live:
1. Open the Netlify URL.
2. Sign up for a new account.
3. Complete your restaurant profile.
4. Add a dish and test the AI auto-fill feature.
5. Create a test payment using Razorpay (use test mode keys first).
6. Verify that images upload correctly (Note: Render's free tier has ephemeral storage. For a true production app with persistent images, you will need a mounted disk on Render, or switch to AWS S3/Cloudinary for image uploads. Keep this in mind!).

> [!WARNING]
> Render's Free and Standard web services use an ephemeral filesystem. This means any files uploaded to the `uploads/` directory will be lost when the server restarts or redeploys. To prevent this, you MUST attach a Persistent Disk to your Render service, or modify the backend to use a cloud storage provider like Cloudinary or AWS S3.
