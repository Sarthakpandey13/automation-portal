# Vahan Automation Project

This tool automates the process of fetching vehicle details from the Vahan portal and storing them in your phpMyAdmin database.

## 🚀 Setup Instructions

1. **Database Setup**:
   - Open **phpMyAdmin**.
   - Import the `schema.sql` file or copy its content and run it in the SQL tab.
   - This will create the `vahan_db` and the `vehicles` table.

2. **Configuration**:
   - Update the `.env` file with your MySQL credentials if they are different from the defaults.
   - The User ID and Password for Vahan are already configured in `config.js`.

3. **Install Dependencies**:
   - Run `npm install` in the project directory.
   - Run `npx playwright install chromium` to install the browser.

4. **Run the Dashboard**:
   - Start the server: `node server.js`
   - Open your browser and go to `http://localhost:3000`.

## 🤖 How it Works

1. **Add Vehicles**: Enter vehicle numbers in the dashboard.
2. **Start Automation**: Click **"Run Scraper"**.
3. **Manual Interaction**: 
   - A Chromium browser will open.
   - The script will enter your User ID and Password.
   - **YOU MUST** manually enter the **CAPTCHA** and the **OTP**.
4. **Scraping**: Once you reach the dashboard, the script will automatically pick vehicles from your database and fetch their details.

## 📁 Project Structure
- `server.js`: Express backend.
- `automation.js`: Playwright automation logic.
- `public/`: Frontend dashboard.
- `schema.sql`: Database schema.
