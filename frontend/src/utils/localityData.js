// Shared locality data for all role dashboards

export const cityCoords = {
  Chennai: [13.0827, 80.2707],
  Coimbatore: [11.0168, 76.9558],
  Madurai: [9.9252, 78.1198],
  Tiruchirappalli: [10.7905, 78.7047],
  Salem: [11.6643, 78.1460],
  Tirunelveli: [8.7139, 77.7567],
  Erode: [11.3411, 77.7172],
};

export const cityProfiles = {
  Chennai:         { lighting: 7, cctv: 7, patrol: 6, crowd: 8, alcohol: 400, area_type: 'commercial',   pop_density: 26000 },
  Coimbatore:      { lighting: 6, cctv: 6, patrol: 5, crowd: 7, alcohol: 600, area_type: 'commercial',   pop_density: 18000 },
  Madurai:         { lighting: 5, cctv: 4, patrol: 4, crowd: 7, alcohol: 500, area_type: 'residential',  pop_density: 14000 },
  Tiruchirappalli: { lighting: 5, cctv: 4, patrol: 4, crowd: 6, alcohol: 600, area_type: 'residential',  pop_density: 12000 },
  Salem:           { lighting: 4, cctv: 3, patrol: 3, crowd: 5, alcohol: 700, area_type: 'slum',         pop_density: 10000 },
  Tirunelveli:     { lighting: 4, cctv: 3, patrol: 3, crowd: 5, alcohol: 750, area_type: 'slum',         pop_density: 9000  },
  Erode:           { lighting: 5, cctv: 5, patrol: 4, crowd: 6, alcohol: 480, area_type: 'commercial',   pop_density: 15000 },
};

export const cities = ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode'];

// ── LOCALITY DATA: city → locality → specific landmarks ──────────────────
// Each locality has coords + risk profile + specific sub-places for routing
// Risk values are recalibrated: new_risk = round(0.4 * original_risk + 0.6 * city_base)
export const localityData = {
  Chennai: {
    'T. Nagar':       { lat: 13.0418, lng: 80.2341, area: 'commercial',  risk: 70, places: ['Pondy Bazaar', 'Panagal Park', 'T. Nagar Bus Stand', 'Usman Road', 'GN Chetty Road', 'Thyagaraya Nagar Signal'] },
    'Anna Nagar':     { lat: 13.0856, lng: 80.2099, area: 'residential', risk: 58, places: ['Anna Nagar Tower Park', '2nd Avenue', 'Shanthi Colony', 'Anna Nagar East', 'CMBT Stop', 'Thirumangalam Signal'] },
    'Tambaram':       { lat: 12.9249, lng: 80.1000, area: 'mixed',       risk: 63, places: ['Tambaram Railway Station', 'Tambaram Market', 'Selaiyur', 'Pallavaram Junction', 'Mudichur', 'East Tambaram'] },
    'Velachery':      { lat: 12.9752, lng: 80.2207, area: 'residential', risk: 60, places: ['Velachery Bus Terminus', 'Vijayanagar', 'Taramani Road', 'BSNL Colony', 'Velachery Lake', 'Phoenix Mall Stop'] },
    'Koyambedu':      { lat: 13.0692, lng: 80.1959, area: 'commercial',  risk: 68, places: ['Koyambedu Market', 'CMBT Bus Stand', 'Koyambedu Junction', 'Padi Signal', 'Flower Market', 'Vegetable Market'] },
    'Adyar':          { lat: 13.0012, lng: 80.2565, area: 'residential', risk: 56, places: ['Adyar Signal', 'Kasturba Nagar', 'Besant Nagar Beach', 'Adyar Depot', 'Lattice Bridge', 'Adyar River Bridge'] },
    'Egmore':         { lat: 13.0732, lng: 80.2609, area: 'commercial',  risk: 67, places: ['Egmore Railway Station', 'Kellys', 'Vepery', 'Park Town', 'Egmore Museum', 'Pudupet'] },
    'Royapuram':      { lat: 13.1142, lng: 80.2893, area: 'slum',        risk: 74, places: ['Royapuram Fishing Harbour', 'Kasimedu', 'Tondiarpet', 'Royapuram Signal', 'Basin Bridge', 'Erukkancheri'] },
    'Perambur':       { lat: 13.1167, lng: 80.2483, area: 'slum',        risk: 72, places: ['Perambur Railway Station', 'Kolathur', 'Madhavaram', 'Perambur Market', 'Vyasarpadi', 'Pulianthope'] },
    'Guindy':         { lat: 13.0067, lng: 80.2206, area: 'industrial',  risk: 61, places: ['Guindy Industrial Estate', 'Guindy Railway Station', 'Raj Bhavan', 'IIT Madras Gate', 'Guindy National Park', 'St. Thomas Mount'] },
    'Sholinganallur': { lat: 12.9010, lng: 80.2279, area: 'mixed',       risk: 59, places: ['Sholinganallur Junction', 'Perungudi', 'OMR Toll', 'Karapakkam', 'Sholinganallur Lake', 'Navalur'] },
    'Ambattur':       { lat: 13.1143, lng: 80.1548, area: 'industrial',  risk: 63, places: ['Ambattur Industrial Estate', 'Ambattur Bus Stand', 'Ambattur OT', 'Padi', 'Anna Nagar West', 'Villivakkam'] },
    'Mylapore':       { lat: 13.0368, lng: 80.2676, area: 'commercial',  risk: 65, places: ['Kapaleeshwarar Temple', 'Mylapore Tank', 'R.A. Puram', 'Luz Corner', 'Mandaveli', 'Alwarpet'] },
    'Avadi':          { lat: 13.1149, lng: 80.0980, area: 'residential', risk: 62, places: ['Avadi Bus Stand', 'Avadi Railway Station', 'Thiruninravur', 'Pattabiram', 'Avadi Camp Road', 'Avadi Market'] },
    'Porur':          { lat: 13.0358, lng: 80.1574, area: 'mixed',       risk: 61, places: ['Porur Junction', 'Mugalivakkam', 'Ramapuram', 'Virugambakkam', 'Arumbakkam', 'Porur Lake'] },
  },
  Coimbatore: {
    'Gandhipuram':    { lat: 11.0168, lng: 76.9718, area: 'commercial',  risk: 60, places: ['Gandhipuram Bus Stand', 'Cross Cut Road', 'DB Road', 'Big Bazaar Street', 'Town Hall', 'Nehru Street'] },
    'RS Puram':       { lat: 10.9963, lng: 76.9638, area: 'commercial',  risk: 55, places: ['RS Puram Market', 'Avinashi Road', 'Race Course', 'Tatabad', 'VOC Park', 'Coimbatore Junction'] },
    'Peelamedu':      { lat: 11.0296, lng: 77.0440, area: 'mixed',       risk: 50, places: ['Peelamedu Signal', 'Airport Road', 'PSG Tech', 'Nava India', 'Peelamedu Lake', 'Hope College'] },
    'Singanallur':    { lat: 10.9883, lng: 77.0189, area: 'residential', risk: 49, places: ['Singanallur Lake', 'Singanallur Bus Stop', 'Goldwins', 'Venkateswara Nagar', 'Ramanathapuram', 'SIHS Colony'] },
    'Saravanampatti': { lat: 11.0558, lng: 77.0183, area: 'residential', risk: 47, places: ['Saravanampatti Market', 'Vilankurichi Road', 'Thudiyalur', 'Kalapatti', 'Neelikonampalayam', 'SIPCOT'] },
    'Vadavalli':      { lat: 11.0024, lng: 76.9149, area: 'slum',        risk: 63, places: ['Vadavalli Junction', 'Chinnavedampatti', 'Vellalore', 'Idigarai', 'Vadavalli Market', 'Mettupalayam Road'] },
    'Podanur':        { lat: 10.9579, lng: 76.9710, area: 'industrial',  risk: 53, places: ['Podanur Junction', 'Podanur Market', 'Nehru Nagar', 'Sowripalayam', 'Podanur Industrial', 'Irugur Road'] },
    'Kuniyamuthur':   { lat: 10.9607, lng: 76.9396, area: 'mixed',       risk: 51, places: ['Kuniyamuthur Bus Stop', 'Kovaipudur', 'Eachanari', 'Madukkarai', 'Kuniyamuthur Market', 'Siruvani Road'] },
  },
  Madurai: {
    'Anna Nagar':     { lat: 9.9396,  lng: 78.1353, area: 'residential', risk: 56, places: ['Anna Nagar Main Road', '4th Street', 'Anna Nagar Signal', 'Annanagar Park', 'Nagamalai', 'Arockiapuram'] },
    'Simmakkal':      { lat: 9.9120,  lng: 78.1197, area: 'commercial',  risk: 64, places: ['Simmakkal Junction', 'Meenakshi Temple Road', 'West Masi Street', 'Netaji Road', 'Chinthamani', 'Periyar Bus Stand'] },
    'KK Nagar':       { lat: 9.9490,  lng: 78.1052, area: 'residential', risk: 54, places: ['KK Nagar Main Road', 'KK Nagar Park', 'Water Tank Stop', 'Arapalayam Signal', 'Anna Bus Stand', 'Thirunagar'] },
    'Tallakulam':     { lat: 9.9307,  lng: 78.1373, area: 'commercial',  risk: 63, places: ['Tallakulam Junction', 'Bypass Road', 'Visalakshi Nagar', 'Gomathipuram', 'Tallakulam Market', 'Surveyor Colony'] },
    'Mattuthavani':   { lat: 9.9598,  lng: 78.1162, area: 'commercial',  risk: 63, places: ['Mattuthavani Bus Terminus', 'NH Stop', 'SIDCO Nagar', 'Madurai Airport Road', 'Pasumalai', 'Othakadai'] },
    'Teppakulam':     { lat: 9.9291,  lng: 78.1345, area: 'mixed',       risk: 59, places: ['Teppakulam Tank', 'East Veli Street', 'North Gate', 'Ellis Nagar', 'Teppakulam Junction', 'Solai Nagar'] },
    'Arappalayam':    { lat: 9.9339,  lng: 78.1101, area: 'slum',        risk: 70, places: ['Arappalayam Bus Stop', 'Nagamalai Pudukkottai', 'Koodal Nagar', 'Jaihindpuram', 'Arappalayam Market', 'Sellur'] },
    'Vilangudi':      { lat: 9.9648,  lng: 78.1516, area: 'residential', risk: 56, places: ['Vilangudi Railway Gate', 'Thirupalai', 'Avaniapuram', 'Keezhapillai Maram', 'Vilangudi Market', 'Umachikulam'] },
  },
  Tiruchirappalli: {
    'Srirangam':      { lat: 10.8657, lng: 78.6929, area: 'commercial',  risk: 58, places: ['Srirangam Temple', 'Amma Mandapam Road', 'Srirangam Market', 'Ariyamangalam Signal', 'Vayalur Road', 'Srirangam Bus Stand'] },
    'Woraiyur':       { lat: 10.8419, lng: 78.7031, area: 'residential', risk: 52, places: ['Woraiyur Bus Stop', 'Golden Rock', 'Khajamalai', 'Woraiyur Market', 'Subramaniapuram', 'Kailasapuram'] },
    'Ariyamangalam':  { lat: 10.7631, lng: 78.7513, area: 'mixed',       risk: 54, places: ['Ariyamangalam Junction', 'Thiruverumbur', 'SIDCO Industrial', 'Kattur', 'Ariyamangalam Market', 'Tharanallur'] },
    'Thillai Nagar':  { lat: 10.8043, lng: 78.6885, area: 'residential', risk: 50, places: ['Thillai Nagar Main Road', '5th Cross', 'Thillai Nagar Park', 'Thillai Nagar Market', 'Ramnagar', 'Contonment'] },
    'KK Nagar':       { lat: 10.7991, lng: 78.7120, area: 'residential', risk: 51, places: ['KK Nagar Bus Stop', 'Melapudur', 'KK Nagar Market', 'Sathya Nagar', 'Puthur Signal', 'Vasan Eye Care Stop'] },
    'Puthur':         { lat: 10.8240, lng: 78.7380, area: 'slum',        risk: 65, places: ['Puthur Junction', 'Ammapet', 'Puthur Market', 'Senthaneerpuram', 'Manachanallur Road', 'Puthur Railway Gate'] },
    'Chathiram':      { lat: 10.8046, lng: 78.6856, area: 'commercial',  risk: 59, places: ['Chathiram Bus Stand', 'Junction Signal', 'Trichy Junction', 'Rockins Road', 'Salai Road', 'Big Bazaar Stop'] },
  },
  Salem: {
    'Fairlands':      { lat: 11.6837, lng: 78.1450, area: 'residential', risk: 54, places: ['Fairlands Signal', 'Collectorate', 'Five Roads', 'Fairlands Park', 'MG Road', 'Salem Medical College'] },
    'Shevapet':       { lat: 11.6612, lng: 78.1560, area: 'commercial',  risk: 61, places: ['Shevapet Market', 'Shevapet Bridge', 'Salem Junction', 'Alagapuram', 'New Bus Stand', 'Fort Area'] },
    'Suramangalam':   { lat: 11.6246, lng: 78.1761, area: 'mixed',       risk: 56, places: ['Suramangalam Bus Stop', 'Gugai', 'Alagapuram', 'Kondalampatti', 'Suramangalam Market', 'Veerapandi'] },
    'Yercaud Road':   { lat: 11.7000, lng: 78.1600, area: 'mixed',       risk: 55, places: ['Yercaud Ghat Entry', 'Shevaroy Hills', 'Kiliyur Falls Route', 'Nangalam', 'Payalam', 'Yercaud Market'] },
    'Hasthampatti':   { lat: 11.6479, lng: 78.1262, area: 'slum',        risk: 66, places: ['Hasthampatti Bus Stop', 'Ammapet', 'Old Bus Stand', 'Muthamizh Nagar', 'Hasthampatti Market', 'Meyyanur'] },
    'Attur Road':     { lat: 11.6960, lng: 78.2020, area: 'residential', risk: 54, places: ['Attur Road Junction', 'Karuppur', 'Seelanaickenpatti', 'Veerappanchatram', 'Thumbal', 'Attur Town'] },
  },
  Tirunelveli: {
    'Palayamkottai':  { lat: 8.7074,  lng: 77.7470, area: 'commercial',  risk: 53, places: ['Palayamkottai Bus Stand', 'St. Xaviers College', 'Shencottah Road', 'Palayamkottai Market', 'Maharaja Nagar', 'Pettai Road'] },
    'Vannarpettai':   { lat: 8.7399,  lng: 77.6883, area: 'slum',        risk: 61, places: ['Vannarpettai Junction', 'Kurukalpatti', 'Thatchanallur', 'Melathidiyoor', 'Vannarpettai Market', 'Nehru Nagar'] },
    'Pettai':         { lat: 8.7128,  lng: 77.7181, area: 'commercial',  risk: 52, places: ['Pettai Junction', 'Tirunelveli Junction', 'Pettai Market', 'Railway Station Road', 'Nadar Lane', 'Cotton Market'] },
    'Melapalayam':    { lat: 8.7195,  lng: 77.7070, area: 'residential', risk: 47, places: ['Melapalayam Bus Stop', 'Melapalayam Market', 'Bibikulam', 'Kamarajar Nagar', 'Mela Colony', 'YMCA Road'] },
    'High Ground':    { lat: 8.7470,  lng: 77.7233, area: 'residential', risk: 45, places: ['High Ground Signal', 'Collectorate Stop', 'Medical College', 'TNEB Office', 'High Ground Park', 'Krishna Nagar'] },
    'Nanguneri Road': { lat: 8.6900,  lng: 77.6680, area: 'mixed',       risk: 50, places: ['Nanguneri Bus Stop', 'Mela Thiruvenkatam', 'Veerapandianpatnam', 'Thisayanvilai', 'Nanguneri Market', 'NH Stop'] },
  },
  Erode: {
    'Erode Town':       { lat: 11.3411, lng: 77.7172, area: 'commercial',  risk: 58, places: ['Erode Railway Station', 'Town Bus Stand', 'Gandhi Park', 'Collector Office', 'Town Hall', 'Big Bazaar Erode'] },
    'Raja Street':      { lat: 11.3479, lng: 77.7250, area: 'commercial',  risk: 62, places: ['Textile Market', 'Silk Cloth Market', 'Gold Market Street', 'Brough Road Market', 'Erode Weavers Colony', 'Handicrafts Centre'] },
    'Surampatti':       { lat: 11.3650, lng: 77.7350, area: 'residential', risk: 51, places: ['Cauvery River Bank', 'Surampatti Lake Park', 'Erode Medical College', 'RTO Office Erode', 'Municipal Stadium', 'Kannan Nagar'] },
    'Perundurai':       { lat: 11.2772, lng: 77.5878, area: 'industrial',  risk: 56, places: ['Perundurai Medical College', 'SIDCO Industrial Estate', 'SIPCOT Perundurai', 'Government Hospital Perundurai', 'Erode-Perundurai Highway', 'Textile Park'] },
    'Bhavani':          { lat: 11.4459, lng: 77.6822, area: 'mixed',       risk: 57, places: ['Sangameswarar Temple', 'Bhavani Adiparasakthi Temple', 'Bhavani River Ghat', 'Bhavani Old Town Market', 'Cauvery-Bhavani Confluence', 'Bhavani Spinning Mills'] },
    'Sathy Road':       { lat: 11.3800, lng: 77.7500, area: 'mixed',       risk: 53, places: ['Chithode Market', 'Karungalpalayam', 'Veerappanchatram Cross', 'Erode-Sathy Highway', 'Kasipalayam', 'TNEB Office Erode'] },
    'Kongalnagaram':    { lat: 11.3200, lng: 77.6900, area: 'slum',        risk: 64, places: ['Thindal Murugan Temple', 'Thindal Market', 'Pillaipatti Area', 'Nasiyanur Road', 'Erode-Coimbatore Highway', 'Kongalnagaram Slum Area'] },
    'Kodumudi':         { lat: 11.0997, lng: 77.8649, area: 'residential', risk: 50, places: ['Kodumudi Murugan Temple', 'Cauvery Ghat Kodumudi', 'Appakudal Market', 'Nambiyur Road Junction', 'Erode-Karur Highway', 'Kodumudi Town Centre'] },
  },
};

export const cityLocations = Object.fromEntries(
  Object.entries(localityData).map(([city, locs]) => [
    city,
    Object.entries(locs).map(([name, d]) => ({ name, lat: d.lat, lng: d.lng }))
  ])
);
