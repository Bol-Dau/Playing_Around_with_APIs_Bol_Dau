# FarmIQ: Smart Agriculture Platform

> FarmIQ helps farmers make smarter decisions by combining live weather forecasts with crop price data. It tells you when to plant, when to hold, and when to sell all in one place.

---
## Demo video
Watch the demo video here: **https://youtu.be/YXvvC8L-7JQ**
---

## Table of Contents

1. [What is FarmIQ?](#what-is-farmiq)
2. [Features](#features)
3. [APIs Used](#apis-used)
4. [Challenges Faced](#challenges-faced)
5. [How to Run Locally](#how-to-run-locally)
6. [How to Run with Docker](#how-to-run-with-docker)
7. [How We Deployed to Web Servers](#how-we-deployed-to-web-servers)
8. [How the Load Balancer Works](#how-the-load-balancer-works)
9. [Bonus Features](#bonus-features)
10. [Credits](#credits)

---

## What is FarmIQ?

FarmIQ is a web application built for farmers. It fetches real weather data for any city and combines it with crop price information to give farmers clear, simple advice like "Plant maize now" or "Hold your coffee stock, prices are rising."

The application was built using plain HTML, CSS, and JavaScript. No frameworks were used, and it runs in any browser.

---

## Features

- **5-day weather forecast**: shows weather condition, temperature, rain chance, and wind speed for any city
- **Planting badges**: each day is labeled Plant, Caution, Danger, or Dry based on the weather
- **Live crop prices**: shows prices for Corn, Wheat, Coffee, Rice, Soybeans, Sugar, and Cocoa
- **Filter and sort prices**: filter by category (Grains, Coffee, Legumes) and sort by name or price
- **Search crops**: type any crop name to find it instantly
- **Price chart**: a horizontal bar chart showing all crop prices visually using Chart.js
- **Smart advice**: combines weather and price data to give farming recommendations
- **User authentication**: sign up and log in with your name, email, and password
- **Dark mode**: switch between light and dark theme, saved automatically
- **API caching**: price data is cached for 10 minutes to avoid unnecessary API calls
- **Input validation**: all inputs are checked and sanitized before use

---

## APIs Used

### 1. OpenWeatherMap For Weather Forecast
This API provides a 5-day weather forecast for any city in the world.

- **Website:** https://openweathermap.org
- **Documentation:** https://openweathermap.org/forecast5
- **Endpoint used:**
  ```
  https://api.openweathermap.org/data/2.5/forecast?q={city}&appid={API_KEY}&units=metric
  ```
- **Free tier:** 1,000 calls per day
- **How to get a key:** Go to https://openweathermap.org, create a free account, and copy your API key from the dashboard.

---

### 2. CommodityPriceAPI: Crop Prices
This API provides real-time prices for commodities like corn, wheat, coffee, and more.

- **Website:** https://commoditypriceapi.com
- **Documentation:** https://commoditypriceapi.com/documentation
- **Endpoint used:**
  ```
  https://api.commoditypriceapi.com/v2/rates/latest?apiKey={KEY}&symbols={SYMBOL}
  ```
- **Free tier:** 2,000 calls per month
- **How to get a key:** Go to https://commoditypriceapi.com, create a free account, and copy your API key from the dashboard.

> **Note:** See the Challenges section below to understand how this API is currently being used in the application.

---

## Challenges Faced

### Challenge 1: CommodityPriceAPI Monthly Limit

During development and testing, the CommodityPriceAPI free plan monthly limit was reached. Once the limit was hit, the API stopped returning price data and returned an error instead.

**How we solved it:**

I created a local Json file called `js/crop.json` that stores the last known real prices from the API. The application reads from this file instead of calling the API. This means the app still works and shows real price data, it is just not updated in real time until the API limit resets next month.

The fallback file looks like this:

```json
{
    "success": true,
    "timestamp": 1773842983,
    "rates": {
        "CORN": 475.35,
        "CA": 165.50,
        "ZW-SPOT": 10.48,
        "SOYBEAN-SPOT": 999.00,
        "RR-SPOT": 17.80,
        "LS": 554.00,
        "CC": 1111.00
    }
}
```
---

### Challenge 2: CommodityPriceAPI Free Plan: One Symbol Per Request

I discovered that the free plan only allows one crop symbol per API request. For example, you cannot ask for CORN, WHEAT, and COFFEE in one request, but you have to make three separate requests.

**How we solved it:**

I looped through each crop symbol and made a separate request for each one, then combined all the results into one object before displaying them.

---

### Challenge 3: Nginx Serving Wrong Page First

When the app was put inside a Docker container, Nginx was serving `index.html` instead of `landing.html` as the home page because Nginx defaults to `index.html` alphabetically.

**How we solved it:**

I created a custom `nginx.conf` file that tells Nginx to serve `landing.html` as the default page. This file is copied into the Docker container during the build.

---

### Challenge 4: Port 80 Already in Use on Servers

When I tried to run the Docker container on port 80, I got an error saying the port was already in use. This was because Nginx and HAProxy from a previous assignment was already running on that port in the webservers and load balancer respectively.

**How we solved it:**

I stopped the conflicting service first using `sudo systemctl stop nginx` and `sudo systemctl stop haproxy` comands, then ran the Docker container.

---

## How to Run Locally

### What you need
- A computer with a web browser
- A code editor (VS Code is recommended)
- Your OpenWeatherMap API key or my OpenWeatherMap API key provided in the submission comment.

---

### Option 1: Open directly in VS Code (simplest)

**Step 1: Clone the repository**

Open your terminal and run:
```bash
git clone https://github.com/Bol-Dau/Playing_Around_with_APIs_Bol_Dau.git
cd farmiq
```

**Step 2: Add your API key**

Open `js/app.js` in your code editor. Find this line near the top:
```javascript
const Weather_API_Key = 'YOUR_OPENWEATHERMAP_KEY_HERE';
```
Replace `YOUR_OPENWEATHERMAP_KEY_HERE` with the API key provided in the submission comment or your own API key incase you have one.

**Step 3 — Open the app**

In VS Code, right-click on `landing.html` and select **Open with Live Server**.

If you do not have Live Server, install it from the VS Code Extensions panel by searching for "Live Server" by Ritwick Dey.

Your browser will open automatically and show the FarmIQ landing page.

> **Note:** Crop prices are loaded from `js/crop.json` automatically. No changes needed for prices to work.

---

## How to Run with Docker

Docker lets you run the app in a container without needing VS Code or Live Server.

**Step 1: Install Docker**

Download and install Docker Desktop from https://www.docker.com/products/docker-desktop

**Step 2: Clone the repository**

```bash
git clone https://github.com/Bol-Dau/Playing_Around_with_APIs_Bol_Dau.git
cd farmiq
```

**Step 3: Add your API key**

Open `js/app.js` and replace the weather API key placeholder as described above.

**Step 4: Build the Docker image**

```bash
docker build -t farmiq .
```

This command reads the `Dockerfile` in the project and builds an image called `farmiq`. You will see it downloading Nginx and copying your files. Wait for it to finish.

**Step 5: Run the container**

```bash
docker run -d -p 8080:80 --name farmiq-app farmiq
```

This starts the app and makes it available on port 8080 of your computer.

**Step 6: Open in browser**

Go to:
```
http://localhost:8080
```

Your FarmIQ landing page will appear.

**To stop the app:**
```bash
docker rm -f farmiq-app
```

**To start it again:**
```bash
docker run -d -p 8080:80 --name farmiq-app farmiq
```

---

## How I Deployed to Web Servers

The application is deployed on two web servers (Web-01 and Web-02) using Docker, and a load balancer (Lb01) using HAProxy.

---

### Step 1: Install Docker on each web server

I SSH into each server using a `ssh` key file:

```bash
ssh -i /path/to/ssh_key ubuntu@IP_Address
```

Then install Docker:

```bash
sudo apt update
sudo apt install docker.io -y
sudo systemctl start docker
sudo systemctl enable docker
```

---

### Step 2: Copy files to the server

From my laptop, I copied the entire project folder to each server using SCP:

```bash
scp -i /path/to/ssh_key -r /path/to/farmiq ubuntu@IP_Address:/home/ubuntu/
```

---

### Step 3: Build and run Docker on the server

On each server:

```bash
cd /home/ubuntu/farmiq
sudo docker build -t farmiq .
sudo docker run -d -p 80:80 --name farmiq-app farmiq
```

---

### Step 4: Verify it is running

```bash
sudo docker ps
```

You should see `farmiq-app` with status `Up`.

Test it:
```bash
curl http://localhost
```

You should see the HTML of the landing page printed in the terminal.

---

## How the Load Balancer Works

The load balancer sits in front of Web-01 and Web-02. When a user visits the load balancer's IP address, HAProxy automatically forwards the request to either Web-01 or Web-02 in turn (round-robin). This means both servers share the traffic equally.

---

### Step 1: Install HAProxy on Lb01

```bash
ssh -i /path/to/ssh_key ubuntu@LB01_IP
sudo apt update
sudo apt install haproxy -y
```

---

### Step 2 — Configure HAProxy

```bash
sudo nano /etc/haproxy/haproxy.cfg
```

I deleted the default content and pasted this configuration:

```haproxy
global
    log /dev/log local0
    maxconn 2000
    daemon

defaults
    log global
    mode http
    option httplog
    timeout connect 5000ms
    timeout client  50000ms
    timeout server  50000ms

# Stats dashboard — shows live traffic between servers
frontend stats
    bind *:8080
    stats enable
    stats uri /stats
    stats refresh 10s
    stats show-node
    stats auth admin:farmiq2026

# Accepts incoming traffic on port 80
frontend farmiq_frontend
    bind *:80
    default_backend farmiq_backend

# Distributes traffic between Web01 and Web02
backend farmiq_backend
    balance roundrobin
    option httpchk GET /
    server 7033-web-01 WEB01_IP:80 check
    server 7033-web-02 WEB02_IP:80 check
```

---

### Step 3: Test and start HAProxy

```bash
# Test the config is valid
sudo haproxy -c -f /etc/haproxy/haproxy.cfg

# Start HAProxy
sudo systemctl start haproxy
sudo systemctl enable haproxy
```

---

### Step 4: Access the app and stats

- **App:** `http://LB01_IP`
- **Stats dashboard:** `http://LB01_IP:8080/stats`
  - Username: `admin`
  - Password: `farmiq2026`

The stats dashboard shows both servers, their status (UP/DOWN), and how many requests each one has handled.

---

## Bonus Features

| Feature | Description |
|---|---|
| User Authentication | Sign up and log in with name, email, and password. Session stored in localStorage. |
| API Caching | Crop price data is cached for 10 minutes to avoid unnecessary API calls. |
| Input Validation | All form inputs are validated. Invalid inputs show red error messages. |
| XSS Protection | All user input is sanitized before use. innerHTML is never used with user data. |
| Chart.js Visualization | Crop prices are displayed as a horizontal bar chart that updates with filters. |
| Docker | App is containerized using Docker with a custom Nginx config. |
| HAProxy Load Balancer | Traffic is distributed between two web servers using round-robin balancing. |
| Dark Mode | Toggle between light and dark theme. Preference is saved automatically. |

---

## Credits

| Resource | Link |
|---|---|
| OpenWeatherMap API | https://openweathermap.org |
| CommodityPriceAPI | https://commoditypriceapi.com |
| Chart.js | https://www.chartjs.org |
| Nginx | https://www.nginx.com |
| Docker | https://www.docker.com |
| HAProxy | https://www.haproxy.org |

---

## API Keys

The API key for OpenWeatherMap is provided in the submission comment section on the assignment page.

To use it:
1. Open `js/app.js`
2. Find this line: `const Weather_API_Key = 'YOUR_OPENWEATHERMAP_KEY_HERE';`
3. Replace `YOUR_OPENWEATHERMAP_KEY_HERE` with the key from the comment

---

*Built by Bol Dau — FarmIQ, 2026*
