const express = require("express");
const axios = require("axios");
const fs = require("fs");
const https = require('https');
const querystring = require('querystring');

const app = express();

let generatedToken = "";  // Variable to store the token
let currentUrl = ""; // Variable to store the current URL

// Function to call the API and get the token
const getToken = async () => {
  try {
    const response = await axios.get("https://dashboard.razorpay.com/user/session?query=client_id%3DOWQhscue9XMw4E%26amp%3Bredirect_uri%3Dhttps%253A%252F%252Fsmartbiz.amazon.in%252Fpayments%252Frazorpay-oauth%26amp%3Bresponse_type%3Dcode%26amp%3Bscope%3Dread_write%26amp%3Bstate%3D71d17028-5bfc-4af8-b92e-99294430bc38&source=oauth", {
      headers: {
        "Cookie": "rzp_usr_session=2944arbjP33rvAmD2zg7DDSsYVSvhg1X6ZUAx5nI;", // Use your session cookie here
      },
      httpsAgent: new https.Agent({ keepAlive: true }),
    });

    // Extract the token from the response data
    generatedToken = response.data.data.token; // Save only the token value

    // Convert the token to a string and save it to a file
    fs.writeFileSync("sessionToken.txt", generatedToken);

    console.log("Token received and stored:", generatedToken); // Print the token to the terminal

    // Call the POST request with the credentials
    await postCredentials(generatedToken);

  } catch (error) {
    console.error("Error fetching token:", error);
  }
};

// Custom function to safely stringify objects with circular references
function safeStringify(obj, replacer = null, spaces = 2) {
  const cache = new Set();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (cache.has(value)) {
        return; // discard circular references
      }
      cache.add(value);
    }
    return replacer ? replacer(key, value) : value;
  }, spaces);
}

const extractCurrentUrl = (responseData) => {
  const regex = /"_currentUrl":\s*"([^"]*)"/;
  const match = responseData.match(regex);
  return match ? match[1] : null;
};

// Function to post credentials using the token
const postCredentials = async (token) => {
  try {
    const tokenToPost = `token=${token}&merchant_id=DE4GKU7TEc1pt9&dashboard_access=true`;

    const response = await axios.post("https://auth.razorpay.com/authorize", tokenToPost, {
      headers: {
        "Cookie": "rzp_usr_session=2944arbjP33rvAmD2zg7DDSsYVSvhg1X6ZUAx5nI;", // Use your session cookie here
        "Content-Type": "application/x-www-form-urlencoded"
      },
      httpsAgent: new https.Agent({ keepAlive: true }),
    });
    const responseDataString = safeStringify(response, null, 2);

    // Save the response data to a file
    fs.writeFileSync("postResponse.txt", responseDataString);

    const extractedUrl = extractCurrentUrl(responseDataString);

    if (extractedUrl) {
      currentUrl = extractedUrl; // Update the currentUrl variable
      console.log('Extracted URL:', currentUrl);
    } else {
      console.log('No URL found in the response');
    }
  } catch (error) {
    console.error("Error posting credentials:", error);
  }
};

// Call getToken every 15 seconds
setInterval(getToken, 15 * 1000); // 15 * 1000 ms = 15 seconds

// GET API to view the generatedToken
app.get("/api/generatedToken", (req, res) => {
  if (generatedToken) {
    res.json({
      message: "Generated token fetched successfully",
      token: generatedToken,
    });
  } else {
    res.status(404).json({
      message: "Generated token not found",
    });
  }
});

// GET API to render HTML file with currentUrl
app.get("/api/offerBanner", (req, res) => {
  if (currentUrl) {
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Amazon Offer Banner</title>
      </head>
      <body>
        <h1>Amazon Offer</h1>
        <p>Check out this amazing offer!</p>
        <a href="${currentUrl}" target="_blank">
          <img src="https://images-eu.ssl-images-amazon.com/images/G/31/AmazonBusiness/980_AB_GIF_Wave03_SP_TopBanner_1242x450_1.jpg" alt="Amazon Offer Banner">
        </a>
      </body>
      </html>
    `;
    res.send(htmlContent);
  } else {
    res.status(404).send('Current URL not found');
  }
});

// Start the Express server
app.listen(8080, () => {
  console.log("Server started on port 8080");
});