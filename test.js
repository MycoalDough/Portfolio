// Get current date and time
const currentDate = new Date();

// Define options for the output format, including the timeZone property
const options = {
  timeZone: 'America/Los_Angeles', // Rancho Cucamonga time zone
  // Other options can be added if needed, such as weekday, year, month, day, hour, minute, second, etc.
};

// Convert the date to the specified time zone
const localDateString = currentDate.toLocaleString(undefined, options);

console.log(localDateString); // Output the date and time in Rancho Cucamonga time
