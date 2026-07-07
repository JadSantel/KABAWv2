const fs = require('fs');
const https = require('https');
const path = require('path');

function getLatestCycle() {
  const now = new Date();
  now.setHours(now.getHours() - 4);
  
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  
  let hour = now.getUTCHours();
  let cycle = '00';
  if (hour >= 18) cycle = '18';
  else if (hour >= 12) cycle = '12';
  else if (hour >= 6) cycle = '06';

  return { date: `${year}${month}${day}`, cycle };
}

const { date, cycle } = getLatestCycle();
console.log(`Fetching GFS data for ${date} cycle ${cycle}z...`);

const filterUrl = `https://nomads.ncep.noaa.gov/cgi-bin/filter_gfs_1p00.pl?file=gfs.t${cycle}z.pgrb2.1p00.f000&lev_10_m_above_ground=on&var_UGRD=on&var_VGRD=on&dir=%2Fgfs.${date}%2F${cycle}%2Fatmos`;

console.log(`URL: ${filterUrl}`);

// Ensure scripts directory exists
if (!fs.existsSync(__dirname)) fs.mkdirSync(__dirname);

const filePath = path.join(__dirname, "gfs_wind.grib2");
const file = fs.createWriteStream(filePath);

https.get(filterUrl, (response) => {
  if (response.statusCode === 200) {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('Downloaded gfs_wind.grib2 successfully.');
      const stats = fs.statSync(filePath);
      console.log(`File size: ${stats.size} bytes`);
    });
  } else {
    console.error(`Request Failed With Status Code: ${response.statusCode}`);
  }
}).on('error', (err) => {
  console.error(`Error: ${err.message}`);
});
