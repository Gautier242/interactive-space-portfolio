// Mobile device detection
const isMobileDevice = document.documentElement.classList.contains('mobile-device');

// Mobile: Panel interactions and controls
if (isMobileDevice) {
  document.addEventListener('DOMContentLoaded', () => {
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.querySelector('.right');
    const sectionTitle = document.querySelector('.section-title');
    const instructionsToggle = document.getElementById('instructionsToggle');
    const legend = document.getElementById('legendText');
    const canvas = document.getElementById('canvas3d');
    
    // Remove all expand/reduce functionality - animation always stays at fixed reduced size
    // Just ensure animation is always at reduced size
    if (leftPanel) {
      leftPanel.classList.remove('expanded');
      leftPanel.style.height = '20vh';
      leftPanel.style.minHeight = '180px';
    }
    
    if (rightPanel) {
      rightPanel.classList.remove('expanded', 'shrunk');
      rightPanel.style.maxHeight = '';
    }
    
    // Instructions toggle - restore old mobile legend content
    if (instructionsToggle && legend) {
      // Set the old mobile-specific legend content
      legend.innerHTML = '<div style="text-align:center; line-height:1.4;"><span class="legend-title"><strong>Tips to navigate in the Interactive 3D Solar System</strong></span><br>Objects with yellow markers have publications · Click planets to highlight publications · ✋ Rotate: drag to orbit · ✢ Pan: click button or Shift+drag to translate · Scroll/pinch to zoom · Click publication to see details & zoom to planet · ⟷ Drag center divider to resize panels</div>';
      
      // Remove active/visible classes so legend starts hidden on mobile
      legend.classList.remove('active', 'visible');
      legend.onclick = null; // Remove the toggleHelp onclick from HTML
      
      instructionsToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        legend.classList.toggle('visible');
        instructionsToggle.textContent = legend.classList.contains('visible') 
          ? 'Hide interaction tips' 
          : 'View interaction tips';
      });
    }
    
    // Mobile zoom handlers will be initialized after camera is created
    // (see code after camera initialization)
    
    // Force initial canvas resize for mobile to fix distortion
    setTimeout(() => {
      if (typeof onWindowResize === 'function') {
        onWindowResize();
        setTimeout(() => onWindowResize(), 100);
        setTimeout(() => onWindowResize(), 300);
      }
    }, 100);
  });
}

// Static Neural Network Background (MLP-style)
function createStaticNeuralNetwork(containerId, layers = [6, 8, 6, 4]) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const width = container.offsetWidth;
  const height = container.offsetHeight;
  const nodes = [];
  
  const layerSpacing = width / (layers.length + 1);
  
  layers.forEach((nodeCount, layerIndex) => {
    const x = layerSpacing * (layerIndex + 1);
    const nodeSpacing = height / (nodeCount + 1);
    
    for (let i = 0; i < nodeCount; i++) {
      const y = nodeSpacing * (i + 1);
      
      const node = document.createElement('div');
      node.className = 'neural-node';
      node.style.left = x + 'px';
      node.style.top = y + 'px';
      container.appendChild(node);
      
      nodes.push({ x, y, layer: layerIndex });
    }
  });
  
  // Connect nodes between adjacent layers
  for (let i = 0; i < nodes.length; i++) {
    const node1 = nodes[i];
    for (let j = i + 1; j < nodes.length; j++) {
      const node2 = nodes[j];
      
      if (node2.layer === node1.layer + 1) {
        const distance = Math.sqrt(
          Math.pow(node2.x - node1.x, 2) +
          Math.pow(node2.y - node1.y, 2)
        );
        
        const line = document.createElement('div');
        line.className = 'neural-line';
        const angle = Math.atan2(node2.y - node1.y, node2.x - node1.x);
        line.style.left = node1.x + 'px';
        line.style.top = node1.y + 'px';
        line.style.width = distance + 'px';
        line.style.transform = `rotate(${angle}rad)`;
        container.appendChild(line);
      }
    }
  }
}

setTimeout(() => {
  createStaticNeuralNetwork('headerNeural', [1, 2, 3, 4, 4, 3, 2, 1]);
  createStaticNeuralNetwork('rightNeural', [4, 5, 8, 6, 4]);
  // createStaticNeuralNetwork('detailNeural', [3, 5, 7, 5, 3]);
}, 100);

// PUBLICATION DATA - CUSTOMIZE HERE
const PUBS = [
  { 
    id: "mit", 
    title: "Signal processing and clustering with ML for smart fiber data from the ISS", 
    inst: "MASSACHUSETTS INSTITUTE OF TECHNOLOGY", 
    subInst: "Media Lab - Responsive Environments - Dr. Joseph Pardiso, 2025",
    icon: "https://picsum.photos/seed/mit/400/300", 
    body: "ISS",
    desc: "Developed a machine learning and signal processing pipeline to automatically analyze and cluster over 100,000 of triggers from a new instrument sent to the International Space Station (ISS) and identify their probable causes. This instrument is based off of custom-made piezoelectric fibers woven  into the outer insulation layer, is designed to detect micrometeorite impacts on the structure, improving eventually real-time structural health monitoring in orbit."+
    "<br><br><span style='color: #9ec9ff;'>Paper under review</span>",
    extendedDesc: "This work focused on developing a data cleansing, signal processing, and machine learning pipeline to analyze and automatically cluster the large dataset collected by a novel instrument deployed on the International Space Station (ISS).<br>The instrument was designed and developed during Dr. Juliana Cherston’s PhD thesis [1] and consists of custom-made piezoelectric fibers woven into the spacecraft’s outer insulation layer. These fibers aim to detect micrometeorite impacts on the ISS exterior, eventually providing a pathway toward real-time structural health monitoring in orbit.<br><br>During its deployment the system recorded more than 100,000 signal triggers, which by far exceeded what could be analyzed manually. Based on my first analysis I developed a pipeline combining signal processing and unsupervised machine learning techniques to automatically cluster and classify these signals, identifying those most likely corresponding to genuine micrometeorite impacts.<br>For this likely-cause identification ground-truth data for genuine micrometeorite impacts were established through controlled high-velocity impact testing using terrestrial facilities such as the Laser-Induced Particle Impact Test (LIPIT) at MIT and the Van de Graaff accelerator at LASP. These experiments generated calibrated piezoelectric response signals corresponding to known particle sizes, velocities, and impact angles. The resulting signatures on all fibers were used to define the expected response characteristics of true impacts, providing a physical basis for validating and interpreting the machine learning clustering results from ISS data."+
    "<br><br><a href='https://dspace.mit.edu/handle/1721.1/152029?show=full' target='_blank' style='color: #9ec9ff; font-weight: bold;'>Additional literature</a>: J. Cherston; The Well-Dressed Spacecraft: Textiles for Cosmic Dust Metrology, (September 2022).",
    links: [{t: "Lab page", u: "https://www.media.mit.edu/groups/responsive-environments/overview/"}],
    img: "images/mit-iss.jpg"
  },
  { 
    id: "swot", 
    title: "From Space to Sea: an application of machine learning to identify soliton in SWOT satellite data", 
    inst: "NASA JET PROPULSION LABORATORY", 
    icon: "https://picsum.photos/seed/swot/400/300", 
    body: "Earth",
    desc: "Built a computer vision pipeline to automatically detect internal ocean waves (solitons) in several hundreds of thousands satellite images from the Surface Water and Ocean Topography (SWOT) mission. The model processes high-resolution remote sensing imagery and applies image cleansing as well as enhancing before automatically identifying wave patterns on the ocean surface. This software provides oceanographers with a novel capability to quickly identify ocean features and thus perform this at global scales.",
    extendedDesc: "This project applied deep learning and computer vision to SWOT’s satellite imagery to identify internal wave phenomena that were previously labor-intensive to find. I developed custom image analysis algorithms to spot patterns of soliton on the ocean surface to better understand their propagation across sequential swaths. Several signal preprocessing steps and a continual learning strategy were integrated so that the model improves as more SWOT data streams in. By developing parallelization capabilities in the preprocessing and detection pipelines the resulting system can analyze hundreds of thousands of images representing SWOT’s sea surface height (SSH) data, detecting internal wave events that influence ocean mixing and energy repartition. This work provides: oceanographers with an automated, scalable method to detect internal waves across the globe, enabling insights into ocean energy transport. The pipeline’s output has been delivered as a practical software tool, accelerating feature detection with an AI-assisted approach."+
    "<br><br><strong style='color: #9ec9ff;'>Acknowledgment</strong>: JPL Spotlight Technology award in May 2024."+
    "<br><strong style='color: #9ec9ff;'>Publications and presentations</strong>: 1 abstract accepted at AGU24, 1 oral presentation at AGU24 and 1 paper currently in progress",
    authors: "<strong>G. Bardi</strong>, T. Lu, M. Archer, J. Wang", 
    // venue: "AGU 2024",
    links: [{t: "Accepted for oral presentation - link to abstract", u: "https://agu.confex.com/agu/agu24/meetingapp.cgi/Paper/1655008"}],
    img: "images/swot.webp"
  },
  { 
    id: "rover", 
    title: "Digital twin and physics informed machine learning for rover motion simulation", 
    inst: "NASA JET PROPULSION LABORATORY", 
    icon: "https://picsum.photos/seed/rover/400/300", 
    body: "VIPER",  
    desc: "Created a physics-informed machine learning model for real time prediction of rover mobility on lunar terrain to enable integration of digital twins in virtual test bed based on Omniverse. The system fuses ODEs (Ordinary Differential Equations) with neural networks trained on high-fidelity finite element (FEM) simulations. On the performed tests, the approach proved to speed up predictions by replacing 90-minute FEM simulations with real time ML predictions while providing similar accuracy, enabling real time decision-making.",
    extendedDesc: "With the goal to improve real time motion prediction on Moon regolith for a virtual test lab with rover digital twins, I developed a physics informed machine learning (PIML) architecture that merges Newton's second law with neural networks to emulate how a rover moves on loose lunar soil. Solving the issue of limited available dataset for training by identifying Chrono Engine developed by University of Wisconsin and tested in cooperation with NASA Ames, we generated a rich ground-truth dataset of rover behavior under various slope conditions using Omniverse and Fusion 360. The PIML model mixing mechanics laws and simple neural network was then trained on these simulations with different slopes, capturing complex terramechanics in its parameters. By injecting physical knowledge (through ordinary differential equations) into the network’s design, the model achieved high accuracy, reducing position error from meters to mere centimeters. The main advantage of this method being the inference time reducing from hours with full FEM simulation to real time (~0.2 seconds) with PIML. This physics-informed ML approach effectively creates a real time motion prediction on Moon surface, enabling digital twins testing and mission planners to quickly evaluate rover routes, anticipate slippage or sinkage, and make on-the-fly decisions. The work demonstrates an original solution for space robotics, combining simulation, machine learning, and understanding of mechanics equations of motion to tackle the challenge of real-time prediction in off-world environments.",
    authors: "<strong>G. Bardi</strong>, T. Lu, E. Chow",
    venue: "International Astronautical Congress 2024", 
    links: [{t: "Link to full paper ", u: "https://www.researchgate.net/publication/388579787_Digital_Twin_and_Physics_Informed_Machine_Learning_for_Rover_Motion_Simulation"}],
    img: "images/rover.png"
  },
  { 
    id: "lunarfm", 
    title: "Lunar Foundation Model", 
    inst: "FRONTIER DEVELOPMENT LAB (FDL)", 
    icon: "https://picsum.photos/seed/lunar/400/300", 
    body: "LRO",
    desc: "Developed a <span style=\"color: #9ec9ff; font-weight: 900;\">machine learning and signal processing pipeline</span> to automatically analyze and cluster over 100,000 of triggers from a new instrument sent to the <span style=\"color: #9ec9ff; font-weight: 900;\">International Space Station and identify</span> their probable causes. This instrument, based on custom-made piezoelectric fibers woven into the outer insulation layer, is designed to <span style=\"color: #9ec9ff; font-weight: 900;\">detect micrometeorite impacts</span> on the structure, improving eventually real-time structural health monitoring in orbit.",
    extendedDesc: "We used a wide array of lunar datasets from missions like GRAIL (gravity field), LRO/LOLA (topography), Clementine (multispectral imagery), and Mini-RF (radar) to train a <span style=\"color: #9ec9ff; font-weight: 700;\"> visual transformer to grasp a multimodal understanding of the Moon</span>. Rather than treating each dataset in isolation, the foundation model fuses them, learning the complex interdependencies (e.g. how surface mineral signals correlate with subsurface density or gravity anomalies) to answer complex tasks. Through <span style=\"color: #9ec9ff; font-weight: 700;\">multi masked autoencoder</span>, we obtained condensed informative <span style=\"color: #9ec9ff; font-weight: 700;\">embeddings that can be used for downstream tasks</span>, similarity search or to augment the vocabulary of an LLM. Users can interact with this model via <span style=\"color: #9ec9ff; font-weight: 700;\">high-level queries</span> for example, asking which regions have high titanium content or predict geologic features of a given location and receive informed answers with supporting maps. The system thus functions as an <span style=\"color: #9ec9ff; font-weight: 700;\">AI lunar agent</span>, capturing both measured data and learned predictions about unmeasured properties. By providing instant access to integrated lunar information, the <span style=\"color: #9ec9ff; font-weight: 700;\">Lunar Foundation Model aims at supporting scientific discovery or mission planning</span>. It represents a shift from siloed analysis to a holistic, data-driven approach for planetary science, illustrating how foundation models can accelerate our return to the Moon with better information and confidence.",
    authors: "G. Bardi*, J. Gawlikowski*, M. Girona-Mata*, S. Goski*, S.Kaczmarek, R. Ramos", 
    venue: "Publication in progress",
    links: [{t: "Link to website and technical presentation", u: "https://lunarlab.ai/"}],
    img: "images/lunarlab2.png"
  },
  { 
    id: "esa", 
    title: "Moon Mineral Classification from VNIR", 
    inst: "EUROPEAN SPACE AGENCY - EUROPEAN ASTRONAUT CENTER", 
    icon: "https://picsum.photos/seed/esa/400/300", 
    body: "Moon",
    desc: "Contributed to the development of the Machine Learning capabilities of a comprehensive tool set developed to be sent to the Moon to help astronauts select relevant lunar rocks to bring back to Earth.The goal of this CNN based model was to predict the mineral composition of lunar rocks and mineral based on their visible and near-infrared (VNIR) spectra. After improving the current CNN, I proposed a <span style=\"color: #9ec9ff; font-weight: 900;\">new method improving the best CNN accuracy by 15%, and reducing the variance by 90%</span>.",
    extendedDesc: "At  ESA European Astronaut Centre, I developed an AI-driven tool to assist astronauts in the field. In order to predict the mineral composition of a given rock based on its visible and near-infrared (VNIR) spectra, a first CNN was trained and optimized based on a dataset of VNIR spectra of various minerals, essentially learning to recognize the spectral “fingerprints” of different minerals (like plagioclase, olivine, pyroxene, etc.). This dataset was however quite unbalanced with very few examples for some classes and a lot of NaNs on some spectra. The first challenge was, therefore, to develop a sensible preprocessing pipeline to select relevant spectra, clean them, and rebalance the dataset using techniques such as SMOTE. After this data pipeline was validated, I was able to propose improvements to the best CNN, not only increasing its accuracy but also reducing the number of parameters while maintaining similar performance, an important consideration for embedded systems. I then built a new pipeline inspired by time series classifications using 1D convolution feature extractions combined with a ridge classifier. This technique improved the accuracy of the best CNN by ~15%  and dramatically reduced the variability in predictions (by nearly 90%) when training and testing the same model but splitting the same dataset in different train/val/test sets.. The outcome is an instant identification of the likely mineral type as an astronaut scans a rock, without needing Earth-based analysis. This real-time feedback is crucial for surface operations. It lets the crew quickly prioritize interesting samples (for example, spotting a high-titanium basalt worth returning) and avoid wasting limited time on redundant rocks without having them trained as professional geologists. By blending remote sensing techniques with machine learning, the project exemplifies how AI can enhance human exploration, augmenting astronauts’ abilities to conduct science on the Moon.",
    authors: "<strong>G. Bardi</strong>, I. Drozdovsky",  
    venue: "Confidential manuscript at European Astronaut Centre (ESA), 2022", 
    links: [],
    img: "images/esa.png"
  },
  { 
    id: "isu", 
    title: "From Spacecraft to Habitat – Starship HLS", 
    inst: "INTERNATIONAL SPACE UNIVERSITY (ISU)", 
    icon: "https://media.giphy.com/media/l0HlQXlQ3nHyLMvte/giphy.gif", 
    body: "Starship",
    desc: "Performed a comprehensive systems engineering study on repurposing SpaceX’s Starship Human Landing System (HLS) as a permanent lunar habitat. This concept study examined how the Starship HLS, originally designed to transport crew to the Moon, could be converted into a long-term living and research facility on the lunar surface. We analyzed structural modifications, life support and environmental control upgrades, radiation shielding strategies, crew habitability and psychology factors, and operational logistics needed to sustain a Moon base using a landed Starship as the core module.",
    extendedDesc: "This project, conducted at International Space University’s (ISU) Space Studies Program, tackled the challenge of establishing a permanent habitat on the Moon. Inspired by multiple NASA concepts of reusing past structures into new ones, such as Skylab, we developed the first concept of reusing the Starship Human Landing System (HLS) for that purpose. The team assessed the structural engineering changes required to turn a Starship HLS into a habitat, such as reinforcing the pressure vessel for multi-year use, adding insulation, and integrating airlocks and modules for mobility. We designed an Environmental Control and Life Support System (ECLSS) that could be retrofitted into the vehicle’s large interior, providing air recycling, water purification, and temperature control for a crew of several astronauts over months. Because radiation on the Moon is a serious concern, we evaluated shielding options for instance, lining sections of the Starship with water or packing lunar regolith against its hull to protect inhabitants from solar flares and cosmic rays. Human factors were central: the layout was planned to include crew quarters, workspaces, and exercise areas in the Starship’s voluminous upper stage We also considered psychological well-being (lighting, color, privacy, communications) for occupants during isolation. On the operations side, the study detailed how many launches would be necessary in total and nex concepts of autonomous rovers to perform this transformation such as reusing its propulsion tanks and structures for storage or scientific spaces. The scale of this concept is ambitious: a ~100-ton spacecraft repurposed as a moon base but our analysis showed it is technically feasible and could jump-start a sustainable human presence on the Moon. The study’s results, presented to the international space engineering community, highlighted an original solution: leveraging a lander (Starship HLS) as a ready-made infrastructure for lunar settlement, potentially saving cost and time in humanity’s return to the Moon.",
    authors: "A. Abdin*, <strong>G. Bardi*</strong>, S. Monat*, et al. - *equal contribution ", 
    venue: "International Astronautical Congress 2021",
    links: [{t: "Project full report, executive summary and paper", u: "https://starship1.onuniverse.com/"}],
    img: "images/ISU-starship.png"
  },
  
  { 
    id: "hwo", 
    title: "Habitable Worlds Observatory – AI/ML", 
    inst: "NASA JET PROPULSION LABORATORY", 
    icon: "https://picsum.photos/seed/hwo/400/300", 
    body: "HWO",  // Linked to HWO satellite
    desc: "Contributing to NASA’s next flagship exoplanet mission, the Habitable Worlds Observatory, through participation in the AI and ML working group for mission operations, and data analysis. This work explores how intelligent algorithms can optimize many capabilities of the HWO including observation schedules, automate telescope operations, and enhance analysis of faint exoplanet signals, addressing the grand challenge of detecting biosignatures on distant Earth-like planets.",
    extendedDesc: "As part of HWO development, early stage working groups have been constituted including on AI. As part of several AI working groups, I contributed to investigating machine learning strategies to support different capabilities of this future flagship telescope. On the mission operations side, we thought of how  AI could improve planners to autonomously schedule observations and calibrations, making real-time decisions to maximize the telescope’s productivity. For data analysis, we analyzed the possibility of having  ML models to sift through vast astronomical datasets and identify spectral or imaging clues indicative of exoplanets and potential biosignatures. The context is analogous to what the James Webb Space Telescope achieved, but HWO aims even further: directly imaging Earth-sized exoplanets in the habitable zone, which pushes the limits of sensitivity and data volume. AI tools will help isolate exoplanet light from overwhelming starlight, using advanced signal processing and anomaly detection to spot atmospheric biomarkers. We also contributed to a community white paper outlining how AI can assist in HWO’s mission architecture and science workflows. By embedding AI into this flagship’s design from the start, the project exemplifies how autonomous systems and human scientists can collaborate to accelerate discovery. The HWO AI/ML effort is thus paving the way for more efficient, insightful exoplanet exploration, potentially transforming how we search for life beyond our solar system.",
    authors: "V. Da Poian, U. Rebbapragada, <strong>G. Bardi</strong>, et al.", 
    venue: "AGU 2024", 
    links: [{t: "Link to AGU abstract", u: "https://www.nasa.gov/"}],
    img: "images/hwo.png"
  },
  { 
    id: "megsai", 
    title: "MEGS‑AI – EUV from AIA", 
    inst: "FRONTIER DEVELOPMENT LAB (FDL)",  
    icon: "https://picsum.photos/seed/megsai/400/300", 
    body: "Mars",  // Linked to Mars
    desc: "Contributed to a deep learning model (“MEGS-AI”) that estimates the Sun’s full extreme ultraviolet (EUV) spectral irradiance using only images from the Solar Dynamics Observatory’s AIA camera. MEGS-AI bridges gaps when direct EUV spectrometers are offline or unavailable by reconstructing hidden spectral data from imaging. This capability helps provide continuous monitoring of solar irradiance  critical to space weather understanding and preserving assets in space.",
    extendedDesc: "This project addressed a key space weather challenge: improving the predictions of solar EUV flux in wavelength bands that aren’t directly measured at all times. By adapting the datasets and testing new architectures, we trained new neural networks, such as KANs (Kolmogorov-Arnold Networks), on historical data where both imaging and spectral readings were available, learning the complex mapping from 2D solar images to full spectral irradiance curves. The model ingests multi-band ultraviolet images from SDO/AIA (Atmospheric Imaging Assembly) instruments and outputs an estimated spectrum (e.g. data the EUV sensors like SDO/EVE would provide). By capturing correlations between the sun’s visible coronal structures and its emitted spectrum, our approach can fill in missing data during instrument outages or when only imagers are active. MEGS-AI (Machine-learning EUV Global Spectrum from AIA) employs deep learning architectures to achieve high accuracy, and it continues to improve as more labeled data (image-spectrum pairs) are accumulated. Using previous project SuNeRF to provide estimations of images of the Sun seen from the surface of Mars, MEGS-AI can then provide predictions of the full irradiance spectrum that can be validated against measurements performed by MAVEN (Mars Atmosphere and Volatile EvolutioN) probe. This work can  offer a real-time proxy for solar irradiance, which is a key input for models of Earth’s ionosphere, satellite drag calculations, and radiation dose forecasting for astronauts. In essence, this project aims at  demonstrating how AI can act as a virtual sensor in space science, augmenting physical instruments and ensuring robustness in crucial space weather data streams.",
    authors: "<strong>G. Bardi</strong>, B. Isola, R. Jarolim, et al.", 
    venue: "AGU 2024 · FDL 2024",
    links: [{t: "Accepted for oral presentation - link to abstract", u: "https://fdl.ai/"}],
    img: "images/megsai.png"
  },
  { 
    id: "sunerfs", 
    title: "SuNeRFs – 4D Solar Corona", 
    inst: "FRONTIER DEVELOPMENT LAB (FDL)",  
    icon: "https://media.giphy.com/media/3oKIPnAiaMCws8nOsE/giphy.gif", 
    body: "Sun",  // Linked to Sun
    desc: "Contributed to the development of Neural Radiance Field (NeRF) techniques to reconstruct a time-varying 3D model of the Sun’s corona from multi-viewpoint imagery. This deep learning approach captures the evolving density and temperature structure of the solar corona, enabling new scientific approximations  of solar characteristics. By creating a dynamic, volumetric map of the Sun’s atmosphere, the project provides researchers with unprecedented insight into the drivers of space weather.",
    extendedDesc: "In this interdisciplinary heliophysics project (part of NASA’s FDL AI accelerator), we built on top of the existing first 3D model of the sun (SuNeRF) leveraging NeRF technique typically  used for photorealistic scene reconstruction. This model  combines images from multiple spacecrafts (e.g. SDO/AIA and STEREO) to feed a neural network that learns a volumetric representation of the solar corona. The resulting “SuNeRF” model is a four-dimensional dataset (3D space + time) that shows values of emission and absorption in the sun . Technically, the neural network encodes the physics of light transport through glowing plasma, allowing it to infer hidden structures between observed viewpoints. The reconstructed output can be rendered from any angle, providing scientists estimations of visualizations not observed at a given time or never observed before. We contributed to improve this model by adding more physics into the model to predict not only emission and absorption but temperature and density as more useful insights for scientists. This original application of NeRF to solar physics opens the door for AI-driven models in space science ultimately improving our knowledge of the sun and coronal mass ejections that can affect satellites and power grids.",
    authors: "B. Isola, <strong>G. Bardi</strong>, R. Jarolim, et al.", 
    venue: "AGU 2024 · FDL 2024",
    links: [{t: "Accepted for interactive presentation - link to abstract", u: "https://fdl.ai/"}],
    img: "images/SUNERF.png"
  }
];

const ABOUT_ME = {
  id: "about",
  title: " Gautier Bardi de Fourtou",
  inst: "MIT · NASA JPL · ISU",
  desc: "Researcher at the intersection of AI and Space Technology, developing innovative solutions for space exploration and Earth observation.",
  extendedDesc: "Currently working at Space Cargo Unlimited as Data Science & AI Applied Engineer in charge of the technical development of AI models that will enable us to exploit scientific data produced in microgravity and optimize the operations of our space systems. My work spans from developing intelligent sensor systems for the International Space Station to creating foundation models for lunar exploration. I'm passionate about leveraging artificial intelligence to advance our understanding of the cosmos and improve life on Earth. My research combines deep learning, computer vision, physics-informed machine learning, and systems engineering to solve complex challenges in space science and exploration.",
  // authors: "<strong>PhD Candidate in AI for Space</strong>",
  venue: "MIT Media Lab · NASA Jet Propulsion Laboratory · International Space University",
  subsections: [
    {
      title: "Selected Talks & Outreach",
      items: [
        "AGU 2024 — Oral: MEGS‑AI; From Space to Sea",
        "IAC 2024 — Interactive: Physics‑informed twins for lunar rovers",
        "Invited — Southwest Research Institute (SWRI): SWOT ML",
        "Invited — NASA Johnson Space Center — ROI Lab"
      ]
    },
    {
      title: "Awards",
      items: [
        "NASA JPL Spotlight Technology Award — computer vision for SWOT internal waves (2024)",
        "ESA · CNES Fellowship — International Space University Space Studies Program (2021)",
        "Airbus Innovation Awards — HMI & multi‑agent software (2014, 2015)"
      ]
    }
  ],
  links: [
    // {t: "CV/Resume", u: "#"},
    // {t: "Research Portfolio", u: "#"},
    {t: "Contact", u: "https://www.linkedin.com/in/bardi242/"}
  ],
  img: "images/headshot.jpg"
};

function groupPublications() {
  const grouped = {};
  PUBS.forEach(pub => {
    if (!grouped[pub.inst]) {
      grouped[pub.inst] = [];
    }
    grouped[pub.inst].push(pub);
  });
  return grouped;
}

function renderPublications() {
  const pubsList = document.getElementById('pubsList');
  const grouped = groupPublications();
  
  pubsList.innerHTML = '';
  
  Object.entries(grouped).forEach(([institution, pubs]) => {
    const instDiv = document.createElement('div');
    instDiv.className = 'institution-group';
    
    const instTitle = document.createElement('div');
    instTitle.className = 'institution-title';
    instTitle.textContent = institution;
    instDiv.appendChild(instTitle);
    
    pubs.forEach(pub => {
      const card = document.createElement('div');
      card.className = 'pub-card';
      card.dataset.id = pub.id;
      card.dataset.body = pub.body;
      
      let linksHTML = '';
      if (pub.links && pub.links.length > 0) {
        linksHTML = '<div class="pub-links">' + 
          pub.links.map(l => `<a href="${l.u}" target="_blank" onclick="event.stopPropagation()">${l.t}</a>`).join('') + '</div>';
      }
      
      card.innerHTML = `
        <div class="pub-image">
          <img src="${pub.img}" alt="${pub.title}" loading="lazy" onerror="this.onerror=null;this.src=window.PLACEHOLDER_IMG"/>
        </div>
        <div class="pub-content">
          <div class="pub-header">
            <div class="pub-title">${pub.title}</div>
            <div class="pub-inst">${pub.inst}</div>
            ${pub.subInst ? `<div class="pub-subinst">${pub.subInst}</div>` : ''}
          </div>
          <div class="pub-desc">${pub.desc}</div>
          <div class="pub-meta">
            ${pub.authors ? `<div>${pub.authors}</div>` : ''}
            ${pub.venue ? `<div style="margin-top:4px">${pub.venue}</div>` : ''}
          </div>
          ${linksHTML}
        </div>
      `;
      
      card.addEventListener('click', () => {
        // Exit Moon surface view when clicking a publication
        if (moonSurfaceActive) {
          moonSurfaceActive = false;
          document.getElementById('moonSurface').classList.remove('active');
        MoonMission.hideMission();
        }
        
        showDetail(pub);
        
        let zoomTarget = pub.body;
        const bodyInfo = bodyData.find(b => b.name === pub.body);
        if (!bodyInfo) {
          const objectInScene = bodyData.find(b => b.body === pub.body);
          if (objectInScene) {
            zoomTarget = objectInScene.name;
          }
        }
        
        if (zoomTarget) {
          zoomToBody(zoomTarget);
        }
      });
      
      // Disable hover effects on mobile
      if (!isMobileDevice) {
        card.addEventListener('mouseenter', () => {
          card.classList.add('highlighted');
          
          let objectToHighlight = pub.body;
          const objectInScene = bodyData.find(b => b.body === pub.body && b.name !== pub.body);
          if (objectInScene) {
            objectToHighlight = objectInScene.name;
          }
          
          if (objectToHighlight) {
            highlightBody(objectToHighlight);
          }
        });
        
        card.addEventListener('mouseleave', () => {
          card.classList.remove('highlighted');
          
          let objectToUnhighlight = pub.body;
          const objectInScene = bodyData.find(b => b.body === pub.body && b.name !== pub.body);
          if (objectInScene) {
            objectToUnhighlight = objectInScene.name;
          }
          
          if (objectToUnhighlight) {
            unhighlightBody(objectToUnhighlight);
          }
        });
      }
      
      instDiv.appendChild(card);
    });
    
    pubsList.appendChild(instDiv);
  });
}

function showDetail(item) {
  const detailView = document.getElementById('detailView');
  const detailImageContainer = document.getElementById('detailImageContainer');
  const detailImg = document.getElementById('detailImg');
  const detailTitle = document.getElementById('detailTitle');
  const detailInst = document.getElementById('detailInst');
  const detailSubInst = document.getElementById('detailSubInst');
  const detailDesc = document.getElementById('detailDesc');
  const detailAuthors = document.getElementById('detailAuthors');
  const detailVenue = document.getElementById('detailVenue');
  const detailSubsections = document.getElementById('detailSubsections');
  const detailLinks = document.getElementById('detailLinks');
  const detailHeaderTitle = document.getElementById('detailHeaderTitle');
  
  // Track publication views
  if (window.goatcounter) {
    window.goatcounter.count({
      path: '/publication/' + item.id,
      title: 'Publication: ' + item.title,
      event: true
    });
  }
  
  // Mobile: Ensure animation stays at fixed reduced size when opening detail view
  if (isMobileDevice) {
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.querySelector('.right');
    if (leftPanel && rightPanel) {
      leftPanel.classList.remove('expanded');
      leftPanel.style.height = '20vh';
      leftPanel.style.minHeight = '180px';
      rightPanel.classList.remove('expanded', 'shrunk');
      rightPanel.style.maxHeight = '';
      
      // Force canvas resize
      if (typeof onWindowResize === 'function') {
        onWindowResize();
        setTimeout(() => onWindowResize(), 50);
        setTimeout(() => onWindowResize(), 100);
      }
    }
  }
  
  // Pause animation and center on related object
  if (item.body && item.id !== 'about') {
    pausedPlanets = true;
    document.getElementById('btnPause').textContent = '▶';
    zoomToBody(item.body);
  }
  
  if (item.id === 'about') {
    detailImageContainer.classList.add('about-image');
  } else {
    detailImageContainer.classList.remove('about-image');
  }
  
  detailImg.src = item.img;
  detailImg.onerror = function() {
    this.onerror = null;
    this.src = window.PLACEHOLDER_IMG;
  };
  
  detailTitle.textContent = item.title;
  detailInst.innerHTML = item.inst;
  detailSubInst.innerHTML = item.subInst || '';
  detailSubInst.style.display = item.subInst ? 'block' : 'none';
  
  // Unified logic for both Mobile and Desktop:
  // Show extended description if available, otherwise fallback to short description.
  const detailExtendedDesc = document.getElementById('detailExtendedDesc');
  
  // Set the main description block to the best available text
  detailDesc.innerHTML = item.extendedDesc || item.desc;
  
  // Ensure the secondary "extended" block is hidden/empty to prevent duplication
  if (detailExtendedDesc) {
    detailExtendedDesc.innerHTML = '';
    detailExtendedDesc.style.display = 'none';
  }
  
  detailAuthors.innerHTML = item.authors ? '<strong>Authors:</strong> ' + item.authors : '';
  detailVenue.innerHTML = item.venue ? '<strong>Venue:</strong> ' + item.venue : '';
  detailHeaderTitle.textContent = item.id === 'about' ? 'About Me' : 'Publication Details';
  
  // Handle subsections (for About Me)
  detailSubsections.innerHTML = '';
  if (item.subsections && item.subsections.length > 0) {
    item.subsections.forEach(subsection => {
      const subDiv = document.createElement('div');
      subDiv.className = 'detail-subsection';
      
      const title = document.createElement('h4');
      title.textContent = subsection.title;
      subDiv.appendChild(title);
      
      const list = document.createElement('ul');
      subsection.items.forEach(itemText => {
        const li = document.createElement('li');
        li.textContent = itemText;
        list.appendChild(li);
      });
      subDiv.appendChild(list);
      
      detailSubsections.appendChild(subDiv);
    });
  }
  
  let linksHTML = '';
  if (item.links && item.links.length > 0) {
    linksHTML = item.links.map(l => `<a href="${l.u}" target="_blank">${l.t}</a>`).join('');
  }
  detailLinks.innerHTML = linksHTML;
  
  // Shrink left panel to 30% when showing detail
  const leftPanel = document.getElementById('leftPanel');
  if (leftPanel) {
    leftPanel.style.flex = '0 0 30%';
    updateImageSizes(70);
    // Call resize multiple times during transition to prevent black band
    requestAnimationFrame(() => {
      onWindowResize();
      setTimeout(() => onWindowResize(), 50);
      setTimeout(() => onWindowResize(), 100);
      setTimeout(() => onWindowResize(), 150);
      setTimeout(() => onWindowResize(), 200);
      setTimeout(() => onWindowResize(), 300);
      setTimeout(() => onWindowResize(), 350);
    });
  }
  
  detailView.classList.add('active');
}

function showAbout() {
  showDetail(ABOUT_ME);
}

function toggleHelp() {
    const legend = document.getElementById('legendText');
    if (isMobileDevice) {
        legend.classList.toggle('visible');
    } else {
        legend.classList.toggle('active');
    }
}

let currentFontScale = 1.0;
function changeTextSize(delta) {
  currentFontScale = Math.max(0.7, Math.min(1.5, currentFontScale + delta));
  document.documentElement.style.setProperty('--detail-font-scale', currentFontScale);
}

function hideDetail() {
  const detailView = document.getElementById('detailView');
  detailView.classList.remove('active');
  
  // Resume animation when closing detail
  if (pausedPlanets) {
    pausedPlanets = false;
    document.getElementById('btnPause').textContent = '⏸';
  }
  
  // Mobile: Ensure animation stays at fixed reduced size when closing detail
  if (isMobileDevice) {
    const leftPanel = document.getElementById('leftPanel');
    const rightPanel = document.querySelector('.right');
    if (leftPanel && rightPanel) {
      leftPanel.classList.remove('expanded');
      leftPanel.style.height = '20vh';
      leftPanel.style.minHeight = '180px';
      rightPanel.classList.remove('expanded', 'shrunk');
      rightPanel.style.maxHeight = '';
      
      // Force canvas resize
      if (typeof onWindowResize === 'function') {
        onWindowResize();
        setTimeout(() => onWindowResize(), 50);
        setTimeout(() => onWindowResize(), 100);
      }
    }
  } else {
    // Desktop: Restore left panel to 45% when closing detail
    const leftPanel = document.getElementById('leftPanel');
    if (leftPanel) {
      leftPanel.style.flex = '0 0 35%';
      updateImageSizes(55);
      // Call resize multiple times during transition to prevent black band
      requestAnimationFrame(() => {
        onWindowResize();
        setTimeout(() => onWindowResize(), 50);
        setTimeout(() => onWindowResize(), 100);
        setTimeout(() => onWindowResize(), 150);
        setTimeout(() => onWindowResize(), 200);
        setTimeout(() => onWindowResize(), 300);
        setTimeout(() => onWindowResize(), 350);
      });
    }
  }
  
  // Exit Moon surface view when closing detail
  if (moonSurfaceActive) {
    moonSurfaceActive = false;
    document.getElementById('moonSurface').classList.remove('active');
        MoonMission.hideMission();
  }
  
  document.querySelectorAll('.pub-card').forEach(card => {
    card.classList.remove('highlighted');
  });
}

function highlightPublication(bodyName) {
  const cards = document.querySelectorAll('.pub-card');
  
  cards.forEach(card => {
    if (card.dataset.body === bodyName) {
      card.classList.add('highlighted');
    } else {
      card.classList.remove('highlighted');
    }
  });
}

function highlightBody(bodyName) {
  const body = bodies[bodyName] || (bodyName === 'Sun' ? sun : null);
  if (!body) return;
  
  const mesh = body.mesh || body;
  if (PlanetMats.setHighlight(mesh, true)) return;
  mesh.traverse(node => {
    if (node.material && node.material.emissive) {
      node.material.emissive.setHex(0xffffff);
      node.material.emissiveIntensity = 0.3;
    }
  });
}

function unhighlightBody(bodyName) {
  const body = bodies[bodyName] || (bodyName === 'Sun' ? sun : null);
  if (!body) return;
  
  const mesh = body.mesh || body;
  if (PlanetMats.setHighlight(mesh, false)) return;
  mesh.traverse(node => {
    if (node.material && node.material.emissive) {
      node.material.emissive.setHex(0x000000);
      node.material.emissiveIntensity = 0;
    }
  });
}

function getCurrentViewTarget() {
  // Calculate where the camera is currently looking
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const distance = 100; // Look ahead distance
  return camera.position.clone().add(direction.multiplyScalar(distance));
}

// Resizable panels - disabled on mobile
const resizer = document.getElementById('resizer');
const leftPanel = document.getElementById('leftPanel');
let isResizing = false;

if (!isMobileDevice && resizer) {
  resizer.addEventListener('mousedown', e => {
    isResizing = true;
    document.body.style.cursor = 'col-resize';
  });

  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    const newWidth = (e.clientX / window.innerWidth) * 100;
    if (newWidth > 15 && newWidth < 75) {
      leftPanel.style.flex = `0 0 ${newWidth}%`;
      updateImageSizes(100 - newWidth);
      onWindowResize();
    }
  });

  document.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      
      // Force canvas update by triggering multiple resize calls to eliminate black bar
      requestAnimationFrame(() => {
        onWindowResize();
        setTimeout(() => onWindowResize(), 10);
        setTimeout(() => onWindowResize(), 50);
        setTimeout(() => onWindowResize(), 100);
      });
    }
  });
}

function updateImageSizes(rightPanelPercent) {
  // Prevent this function from setting fixed heights on mobile
  if (isMobileDevice) return; 

  const baseWidth = 250;
  const minWidth = 150;
  const maxWidth = 350;
  
  let newWidth = baseWidth * (rightPanelPercent / 67);
  newWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
  
  document.querySelectorAll('.pub-image').forEach(img => {
    img.style.width = newWidth + 'px';
    img.style.minHeight = (newWidth * 0.75) + 'px';
  });
}

// THREE.JS SETUP
const canvas = document.getElementById('canvas3d');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(50, leftPanel.clientWidth / leftPanel.clientHeight, 0.1, 15000);
// Mobile: Start with the same perspective as expanded view (what user sees after clicking expand)
if (isMobileDevice) {
  camera.position.set(200, 150, 200); // Match expanded view perspective
} else {
  camera.position.set(250, 200, 250);
}
camera.lookAt(0, 0, 0);

// Mobile: Double-tap and pinch-to-zoom handlers (after camera initialization)
if (isMobileDevice && canvas) {
  // Double-tap to zoom
  let lastTap = 0;
  let tapTimeout;
  
  canvas.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTap;
    
    if (tapLength < 300 && tapLength > 0) {
      // Double tap detected
      e.preventDefault();
      clearTimeout(tapTimeout);
      
      // Zoom in/out (toggle)
      const currentDistance = camera.position.length();
      const zoomDirection = currentDistance > 500 ? -1 : 1;
      const zoomAmount = zoomDirection * 100;
      
      const target = getCurrentViewTarget();
      const direction = new THREE.Vector3().subVectors(camera.position, target).normalize();
      camera.position.add(direction.multiplyScalar(zoomAmount));
      
      // Clamp zoom
      const minDistance = 50;
      const maxDistance = 2000;
      const distance = camera.position.length();
      if (distance < minDistance) {
        camera.position.normalize().multiplyScalar(minDistance);
      } else if (distance > maxDistance) {
        camera.position.normalize().multiplyScalar(maxDistance);
      }
      
      lastTap = 0;
    } else {
      lastTap = currentTime;
      tapTimeout = setTimeout(() => {
        lastTap = 0;
      }, 300);
    }
  });
  
  // Pinch-to-zoom
  let initialDistance = 0;
  let initialCameraDistance = 0;
  
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      initialDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      initialCameraDistance = camera.position.length();
    } else {
      // Reset when not two fingers
      initialDistance = 0;
    }
  }, { passive: false });
  
  canvas.addEventListener('touchend', (e) => {
    if (e.touches.length < 2) {
      initialDistance = 0;
    }
  }, { passive: false });
  
  // Touch interactions: rotate/pan (1 finger if button selected) or tap for object selection
  let lastTouchX = 0, lastTouchY = 0;
  let isTouchInteracting = false;
  let touchStartTime = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let hasMoved = false;
  
  canvas.addEventListener('touchmove', (e) => {
    // Disable pinch-to-zoom - only allow zoom via +/- buttons
    if (e.touches.length === 2) {
      // Two fingers: Do nothing - zoom disabled
      e.preventDefault();
      return;
    } else if (e.touches.length === 1) {
      // One finger: Rotate or Pan (if button is selected)
      const rotateBtn = document.getElementById('btnRotate');
      const panBtn = document.getElementById('btnPan');
      
      if (rotateBtn && rotateBtn.classList.contains('active')) {
        // Rotate mode
        e.preventDefault();
        isTouchInteracting = true;
        hasMoved = true; // Mark that we've moved
        const touch = e.touches[0];
        
        if (lastTouchX === 0) {
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          return;
        }
        
        const dx = (touch.clientX - lastTouchX) * 0.005;
        const dy = (touch.clientY - lastTouchY) * 0.005;
        
        const target = getCurrentViewTarget();
        const offset = new THREE.Vector3().subVectors(camera.position, target);
        const r = offset.length();
        
        let sphericalTheta = Math.acos(offset.y / r);
        let sphericalPhi = Math.atan2(offset.z, offset.x);
        
        sphericalPhi -= dx;
        sphericalTheta = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalTheta - dy));
        
        camera.position.x = target.x + r * Math.sin(sphericalTheta) * Math.cos(sphericalPhi);
        camera.position.y = target.y + r * Math.cos(sphericalTheta);
        camera.position.z = target.z + r * Math.sin(sphericalTheta) * Math.sin(sphericalPhi);
        camera.lookAt(target);
        cameraFollowTarget = null;
        
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
      } else if (panBtn && panBtn.classList.contains('active')) {
        // Pan mode
        e.preventDefault();
        isTouchInteracting = true;
        hasMoved = true; // Mark that we've moved
        const touch = e.touches[0];
        
        if (lastTouchX === 0) {
          lastTouchX = touch.clientX;
          lastTouchY = touch.clientY;
          return;
        }
        
        const dx = (touch.clientX - lastTouchX) * 0.5;
        const dy = (touch.clientY - lastTouchY) * 0.5;
        
        const right = new THREE.Vector3();
        const up = new THREE.Vector3();
        camera.getWorldDirection(right);
        right.cross(camera.up).normalize();
        up.copy(camera.up).normalize();
        
        right.multiplyScalar(-dx);
        up.multiplyScalar(dy);
        
        camera.position.add(right);
        camera.position.add(up);
        cameraFollowTarget = null;
        
        lastTouchX = touch.clientX;
        lastTouchY = touch.clientY;
      }
    }
  }, { passive: false });
  
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      lastTouchX = touch.clientX;
      lastTouchY = touch.clientY;
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      touchStartTime = Date.now();
      hasMoved = false;
      isTouchInteracting = false; // Reset - will be set to true if we detect a drag
    }
  }, { passive: false });
  
  canvas.addEventListener('touchend', (e) => {
    // Check if this was a tap (not a drag) - allow object selection
    if (e.changedTouches.length === 1 && !hasMoved) {
      const touch = e.changedTouches[0];
      const touchDuration = Date.now() - touchStartTime;
      const moveDistance = Math.hypot(touch.clientX - touchStartX, touch.clientY - touchStartY);
      
      // If it was a quick tap (less than 300ms and less than 10px movement), allow click
      if (touchDuration < 300 && moveDistance < 10) {
        isTouchInteracting = false; // Allow click event to fire
        
        // Get canvas rect for proper coordinate calculation
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2();
        mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Handle Moon surface clicks
        if (moonSurfaceActive) {
          raycaster.setFromCamera(mouse, moonCamera);
          const moonClickables = [moonStarship, moonViper, moonLRO, moonEarth].filter(obj => obj);
          const moonHits = raycaster.intersectObjects(moonClickables, true);
          
          if (moonHits.length > 0) {
            let objName = moonHits[0].object.userData.name;
            if (!objName && moonHits[0].object.parent) {
              objName = moonHits[0].object.parent.userData.name;
            }
            if (!objName && moonHits[0].object.parent && moonHits[0].object.parent.parent) {
              objName = moonHits[0].object.parent.parent.userData.name;
            }
            
            if (moonEarth && (moonHits[0].object === moonEarth || moonHits[0].object.parent === moonEarth)) {
              moonSurfaceActive = false;
              document.getElementById('moonSurface').classList.remove('active');
        MoonMission.hideMission();
              const earthPub = PUBS.find(p => p.body === 'Earth');
              if (earthPub) {
                showDetail(earthPub);
                highlightPublication('Earth');
                setTimeout(() => zoomToBody('Earth'), 100);
              }
              hasMoved = false;
              return;
            }
            
            if (objName) {
              const pub = PUBS.find(p => p.body === objName);
              if (pub) {
                showDetail(pub);
                highlightPublication(objName);
              }
            }
            hasMoved = false;
            return;
          }
        }
        
        // Handle solar system clicks
        raycaster.setFromCamera(mouse, camera);
        const clickables = Object.values(bodies).map(b => b.mesh).concat([sun]);
        const hits = raycaster.intersectObjects(clickables, true);
        
        if (hits.length > 0) {
          let bodyName = hits[0].object.userData.name;
          if (!bodyName && hits[0].object.parent && hits[0].object.parent.userData) {
            bodyName = hits[0].object.parent.userData.name;
          }
          if (!bodyName && hits[0].object.parent && hits[0].object.parent.parent && hits[0].object.parent.parent.userData) {
            bodyName = hits[0].object.parent.parent.userData.name;
          }
          
          if (bodyName) {
            selectedBody = bodyName;
            const bodyInfo = bodyData.find(b => b.name === bodyName);
            const targetBody = bodyInfo && bodyInfo.body ? bodyInfo.body : bodyName;
            zoomToBody(bodyName);
            const pub = PUBS.find(p => p.body === targetBody);
            if (pub) {
              setTimeout(() => showDetail(pub), 300);
              highlightPublication(targetBody);
            } else {
              hideDetail();
            }
          }
        }
      }
    }
    hasMoved = false;
    initialDistance = 0;
  }, { passive: false });
}

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(leftPanel.clientWidth, leftPanel.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 2));

const ambient = new THREE.AmbientLight(0x1c2333, 0.32);
scene.add(ambient);

const sunLight = new THREE.PointLight(0xfff8e7, 3.1, 2000);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// Deep-space environment: layered starfield + Milky Way dome (environment.js)
SpaceEnv.init(scene);

// Moon Surface Scene
let moonScene, moonCamera, moonRenderer;
let moonSurfaceActive = false;
let moonStarship, moonViper, moonLRO, moonEarth;

function initMoonSurface() {
  const moonCanvas = document.getElementById('moonSurface');
  
  moonScene = new THREE.Scene();
  moonScene.background = new THREE.Color(0x0a0a0a);
  
  moonCamera = new THREE.PerspectiveCamera(60, leftPanel.clientWidth / leftPanel.clientHeight, 0.1, 5000);
  moonCamera.position.set(8, 5, 15); // Better starting angle
  moonCamera.lookAt(0, 0, 0);
  
  moonRenderer = new THREE.WebGLRenderer({ canvas: moonCanvas, antialias: true });
  moonRenderer.setSize(leftPanel.clientWidth, leftPanel.clientHeight);
  moonRenderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobileDevice ? 1.5 : 2));
  
  // Lighting: hard sun at a low angle for long lunar shadows, faint
  // blue earthshine fill. Shadows only exist in this scene.
  moonRenderer.shadowMap.enabled = true;
  moonRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const ambientMoon = new THREE.AmbientLight(0x8899bb, 0.22);
  moonScene.add(ambientMoon);

  const sunLightMoon = new THREE.DirectionalLight(0xfff6e8, 1.55);
  sunLightMoon.position.set(160, 40, 60);
  sunLightMoon.castShadow = true;
  sunLightMoon.shadow.mapSize.set(1024, 1024);
  sunLightMoon.shadow.camera.left = -80;
  sunLightMoon.shadow.camera.right = 80;
  sunLightMoon.shadow.camera.top = 80;
  sunLightMoon.shadow.camera.bottom = -80;
  sunLightMoon.shadow.camera.near = 20;
  sunLightMoon.shadow.camera.far = 420;
  sunLightMoon.shadow.bias = -0.0015;
  moonScene.add(sunLightMoon);
  moonScene.add(sunLightMoon.target);

  // Terrain heightfield + regolith/wheel-track texture + dust (moon-mission.js)
  MoonMission.buildTerrain(moonScene);
  MoonMission.initDust(moonScene);

  // Starship on the pad (shared builder, surface scale)
  const starshipGroup = Spacecraft.buildStarship();
  starshipGroup.scale.multiplyScalar(2.6);
  starshipGroup.position.set(-15, MoonMission.heightAt(-15, -20), -20);
  starshipGroup.traverse(o => { if (o.isMesh) o.castShadow = true; });
  starshipGroup.userData = { name: 'Starship', type: 'clickable' };
  moonScene.add(starshipGroup);
  moonStarship = starshipGroup;

  // VIPER rover
  const viperGroup = Spacecraft.buildViper();
  viperGroup.scale.multiplyScalar(2.1);
  viperGroup.position.set(5, MoonMission.heightAt(5, 5), 5);
  viperGroup.traverse(o => { if (o.isMesh) o.castShadow = true; });
  viperGroup.userData.name = 'VIPER';
  viperGroup.userData.type = 'clickable';
  moonScene.add(viperGroup);
  moonViper = viperGroup;

  // LRO overhead
  const lroGroup = Spacecraft.buildLRO();
  lroGroup.scale.multiplyScalar(2.5);
  lroGroup.position.set(-20, 30, -40);
  lroGroup.userData = { name: 'LRO', type: 'clickable' };
  moonScene.add(lroGroup);
  moonLRO = lroGroup;

  // Earthrise: the real Earth shader hanging in the black sky
  moonEarth = PlanetMats.createPlanet({ name: 'Earth', size: 8 });
  moonEarth.position.set(80, 40, -200);
  moonEarth.userData = { name: 'Earth' };
  moonScene.add(moonEarth);

  // Add collectible moon rocks (only visible in rover POV)
  const moonRocks = [];
  const rockGeo = new THREE.DodecahedronGeometry(0.8, 0);
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.95,
    metalness: 0.05,
    emissive: 0x333333,
    emissiveIntensity: 0.05
  });

  for (let i = 0; i < 15; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat.clone());
    rock.position.x = (Math.random() - 0.5) * 100;
    rock.position.z = (Math.random() - 0.5) * 100;
    rock.position.y = MoonMission.heightAt(rock.position.x, rock.position.z) + 0.3;
    rock.rotation.x = Math.random() * Math.PI;
    rock.rotation.y = Math.random() * Math.PI;
    rock.rotation.z = Math.random() * Math.PI;
    rock.userData = { collected: false, id: i };
    rock.scale.set(1.5 + Math.random() * 0.5, 1.5 + Math.random() * 0.5, 1.5 + Math.random() * 0.5);
    rock.castShadow = true;
    rock.visible = false;  // START HIDDEN
    moonScene.add(rock);
    moonRocks.push(rock);
  }

  // Store rocks globally for collision detection
  window.moonRocks = moonRocks;
  window.rocksCollected = 0;

  // Stars
  const moonStarsGeo = new THREE.BufferGeometry();
  const moonStarsVerts = [];
  for (let i = 0; i < 3000; i++) {
    const x = (Math.random() - 0.5) * 2000;
    const y = Math.random() * 1000;
    const z = (Math.random() - 0.5) * 2000;
    moonStarsVerts.push(x, y, z);
  }
  moonStarsGeo.setAttribute('position', new THREE.Float32BufferAttribute(moonStarsVerts, 3));
  const moonStarsMat = new THREE.PointsMaterial({ size: 1.5, color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false });
  const moonStars = new THREE.Points(moonStarsGeo, moonStarsMat);
  moonScene.add(moonStars);

  // Mobile Moon Rotation Logic
  moonCanvas.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
      isDragging = false;
      dragging = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    }
  }, { passive: false });

  moonCanvas.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1 && dragging) {
       e.preventDefault(); // Prevent scrolling while rotating moon
       const x = e.touches[0].clientX;
       const y = e.touches[0].clientY;
       const dx = x - prevX;
       const dy = y - prevY;

       // Use same rotation logic as desktop
       const rotSpeed = 0.005;
       const phi = dx * rotSpeed;
       const theta = dy * rotSpeed;
       
       const target = new THREE.Vector3(0, 0, 0);
       const offset = new THREE.Vector3().subVectors(moonCamera.position, target);
       const r = offset.length();
       
       let sphericalTheta = Math.acos(offset.y / r);
       let sphericalPhi = Math.atan2(offset.z, offset.x);
       
       sphericalPhi -= phi;
       sphericalTheta = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalTheta - theta));
       
       moonCamera.position.x = target.x + r * Math.sin(sphericalTheta) * Math.cos(sphericalPhi);
       moonCamera.position.y = target.y + r * Math.cos(sphericalTheta);
       moonCamera.position.z = target.z + r * Math.sin(sphericalTheta) * Math.sin(sphericalPhi);
       moonCamera.lookAt(target);

       prevX = x;
       prevY = y;
    }
  }, { passive: false });

  moonCanvas.addEventListener('touchend', () => {
    dragging = false;
  });

  // Moon canvas click handler
  moonCanvas.addEventListener('click', e => {
    if (!moonSurfaceActive || isDragging) return;
    
    const rect = moonCanvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, moonCamera);
    const moonClickables = [moonStarship, moonViper, moonLRO, moonEarth].filter(obj => obj);
    const moonHits = raycaster.intersectObjects(moonClickables, true);
    
    if (moonHits.length > 0) {
      let objName = moonHits[0].object.userData.name;
      if (!objName && moonHits[0].object.parent) {
        objName = moonHits[0].object.parent.userData.name;
      }
      if (!objName && moonHits[0].object.parent && moonHits[0].object.parent.parent) {
        objName = moonHits[0].object.parent.parent.userData.name;
      }
      
      // Check if VIPER was clicked - enter rover POV mode
      if (objName === 'VIPER') {
        roverPOVMode = !roverPOVMode;
        viperManualControl = roverPOVMode;

        if (isMobileDevice) {
           toggleRoverControls(roverPOVMode);
        }

        // Toggle rock visibility based on POV mode
        if (window.moonRocks) {
          window.moonRocks.forEach(rock => {
            rock.visible = roverPOVMode;
          });
        }

        if (roverPOVMode) {
          // Position camera behind and above rover
          const roverPos = moonViper.position.clone();
          const roverForward = new THREE.Vector3(0, 0, -1).applyQuaternion(moonViper.quaternion);
          const cameraPos = roverPos.clone().sub(roverForward.multiplyScalar(5)).add(new THREE.Vector3(0, 2, 0));
          moonCamera.position.copy(cameraPos);
          moonCamera.lookAt(roverPos.clone().add(new THREE.Vector3(0, 1, 0)));
        }
        return;
      }
      
      // Check if Earth was clicked - exit Moon view
      if (objName === 'Earth') {
        moonSurfaceActive = false;
        roverPOVMode = false;
        viperManualControl = false;
        document.getElementById('moonSurface').classList.remove('active');
        MoonMission.hideMission();
        
        toggleRoverControls(false);

        const earthPub = PUBS.find(p => p.body === 'Earth');
        if (earthPub) {
          showDetail(earthPub);
          highlightPublication('Earth');
          setTimeout(() => zoomToBody('Earth'), 100);
        }
        return;
      }
      
      // For other objects, show publication details
      if (objName) {
        const pub = PUBS.find(p => p.body === objName);
        if (pub) {
          showDetail(pub);
          highlightPublication(objName);
        }
      }
    }
  });
  
  
  
  
  // Moon surface mouse controls
  moonCanvas.addEventListener('mousedown', e => {
    if (!moonSurfaceActive) return;
    isDragging = false;
    dragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
    if (!roverPOVMode) {
      moonCanvas.style.cursor = 'grabbing';
    }
  });
  
  moonCanvas.addEventListener('wheel', e => {
    if (!moonSurfaceActive) return;
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.85 : 1.15; 
    const direction = new THREE.Vector3();
    moonCamera.getWorldDirection(direction);
    
    moonCamera.position.add(direction.multiplyScalar((delta - 1) * 10));
    
    // Clamp camera distance
    const distance = moonCamera.position.length();
    if (distance < 3) {
      moonCamera.position.normalize().multiplyScalar(3);
    }
    if (distance > 150) {
      moonCamera.position.normalize().multiplyScalar(150);
    }
  }, { passive: false });
}  

function createCornerReticle(s) {
  const l = s * 0.3; // Length of the L-arms
  const g = new THREE.BufferGeometry();
  
  // Define 3 segments per corner: 
  // 1. Horizontal arm (l long)
  // 2. Vertical arm (l long)
  // 3. Diagonal link between tips (length of l)
  const v_new_shape = [
    // Top-Left Corner (x=-s, y=s)
    // 1. Horizontal arm (from -s to -s+l)
    -s, s, 0,        -s + l, s, 0,
    // 2. Vertical arm (from s to s-l)
    -s, s, 0,        -s, s - l, 0,
    // 3. Diagonal link (from (-s+l, s) to (-s, s-l))
    -s + l, s, 0,    -s, s - l, 0,
    
    // Top-Right Corner (x=s, y=s)
    // 1. Horizontal arm (from s to s-l)
    s, s, 0,         s - l, s, 0,
    // 2. Vertical arm (from s to s-l)
    s, s, 0,         s, s - l, 0,
    // 3. Diagonal link (from (s-l, s) to (s, s-l))
    s - l, s, 0,     s, s - l, 0,
    
    // Bottom-Left Corner (x=-s, y=-s)
    // 1. Horizontal arm (from -s to -s+l)
    -s, -s, 0,       -s + l, -s, 0,
    // 2. Vertical arm (from -s to -s+l)
    -s, -s, 0,       -s, -s + l, 0,
    // 3. Diagonal link (from (-s+l, -s) to (-s, -s+l))
    -s + l, -s, 0,   -s, -s + l, 0,
    
    // Bottom-Right Corner (x=s, y=-s)
    // 1. Horizontal arm (from s to s-l)
    s, -s, 0,        s - l, -s, 0,
    // 2. Vertical arm (from -s to -s+l)
    s, -s, 0,        s, -s + l, 0,
    // 3. Diagonal link (from (s-l, -s) to (s, -s+l))
    s - l, -s, 0,    s, -s + l, 0
  ];
  
  g.setAttribute('position', new THREE.Float32BufferAttribute(v_new_shape, 3));
  const mesh = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xf0a548, transparent: true }));
  
  // No 45 degree rotation needed for this shape
  // mesh.rotation.z = Math.PI / 4; 
  
  return mesh;
}

const sunGeo = new THREE.SphereGeometry(18, 64, 64);
const sunMat = new THREE.MeshBasicMaterial({ 
  color: 0xfdb813,
  emissive: 0xfdb813,
  emissiveIntensity: 1
});
const sun = new THREE.Mesh(sunGeo, sunMat);
sun.userData = { name: 'Sun' };

const sunReticle = createCornerReticle(22);
sun.add(sunReticle);
sun.userData.reticle = sunReticle;


scene.add(sun);

// Granulation shader, corona sprite and chromosphere rim (environment.js)
SpaceEnv.initSun(sun);

// BODY DATA - CUSTOMIZE 3D OBJECTS HERE
const bodyData = [
  { name: 'Mercury', color: 0x8c7853, size: 3, orbit: 50, speed: 0.04, roughness: 0.9 },
  { name: 'Venus', color: 0xe8cda2, size: 4.5, orbit: 70, speed: 0.015, roughness: 0.6 },
  { name: 'Earth', color: 0x4a90e2, size: 7, orbit: 100, speed: 0.01, roughness: 0.7 },
  { name: 'Moon', color: 0xaaaaaa, size: 2.5, orbit: 100, speed: 0.01, isMoon: true, parent: 'Earth', moonDist: 15, roughness: 0.9, onSurface: false },
  { name: 'ISS', color: 0xcccccc, size: 4, orbit: 100, speed: 0.01, isMoon: true, parent: 'Earth', moonDist: 10, isStation: true, body: 'ISS' },
  { name: 'HWO', color: 0xffd700, size: 3, orbit: 100, speed: 0.000001, isMoon: true, parent: 'Earth', moonDist: -10, isLagrange: true, body: 'HWO' },
  { name: 'Starship', color: 0xeeeeee, size: 0.8, orbit: 100, speed: 0.01, isMoon: true, parent: 'Moon', moonDist: 0, isSpacecraft: true, onSurface: true, body: 'Starship' },
  { name: 'VIPER', color: 0x999999, size: 0.5, orbit: 100, speed: 0.01, isMoon: true, parent: 'Moon', moonDist: 0, isRover: true, onSurface: true, body: 'VIPER' },
  { name: 'LRO', color: 0xdddddd, size: 0.6, orbit: 100, speed: 0.01, isMoon: true, parent: 'Moon', moonDist: 5, isSatellite: true, body: 'LRO' },
  { name: 'Mars', color: 0xcd5c5c, size: 4, orbit: 135, speed: 0.008, roughness: 0.85 },
  { name: 'Jupiter', color: 0xc88b3a, size: 14, orbit: 210, speed: 0.002, roughness: 0.4 },
  { name: 'Io', color: 0xffd700, size: 1.2, orbit: 210, speed: 0.002, isMoon: true, parent: 'Jupiter', moonDist: 20, roughness: 0.8 },
  { name: 'Europa', color: 0xd4c4a0, size: 1.1, orbit: 210, speed: 0.002, isMoon: true, parent: 'Jupiter', moonDist: 24, roughness: 0.3 },
  { name: 'Ganymede', color: 0xa89988, size: 1.5, orbit: 210, speed: 0.002, isMoon: true, parent: 'Jupiter', moonDist: 28, roughness: 0.7 },
  { name: 'Callisto', color: 0x7a7265, size: 1.3, orbit: 210, speed: 0.002, isMoon: true, parent: 'Jupiter', moonDist: 32, roughness: 0.9 },
  { name: 'Saturn', color: 0xfad5a5, size: 12, orbit: 270, speed: 0.0009, hasRing: true, roughness: 0.5 },
  { name: 'Titan', color: 0xffa500, size: 1.4, orbit: 270, speed: 0.0009, isMoon: true, parent: 'Saturn', moonDist: 22, roughness: 0.4 },
  { name: 'Enceladus', color: 0xf0f8ff, size: 0.7, orbit: 270, speed: 0.0009, isMoon: true, parent: 'Saturn', moonDist: 18, roughness: 0.1 },
  { name: 'Rhea', color: 0xd3d3d3, size: 0.9, orbit: 270, speed: 0.0009, isMoon: true, parent: 'Saturn', moonDist: 20, roughness: 0.8 },
  { name: 'Uranus', color: 0x4fd0e7, size: 7, orbit: 330, speed: 0.0004, roughness: 0.3 },
  { name: 'Neptune', color: 0x4166f5, size: 6.8, orbit: 390, speed: 0.0001, roughness: 0.3 },
  { name: 'Ceres', color: 0x888888, size: 1.2, orbit: 165, speed: 0.005, roughness: 0.95 },
  { name: 'Vesta', color: 0xaa9988, size: 0.8, orbit: 170, speed: 0.0048, roughness: 0.9 },
  { name: 'Pallas', color: 0x9999aa, size: 0.7, orbit: 168, speed: 0.0049, roughness: 0.95 }
];

const bodies = {};
const orbits = [];
const moonOrbits = [];
const originalColors = new Map();

bodyData.forEach(d => {
  let mesh;

  if (d.isStation) {
    mesh = Spacecraft.buildISS();
  } else if (d.isLagrange) {
    mesh = Spacecraft.buildHWO();
  } else if (d.isSpacecraft) {
    mesh = Spacecraft.buildStarship();
  } else if (d.isRover) {
    mesh = Spacecraft.buildViper();
  } else if (d.isSatellite) {
    mesh = Spacecraft.buildLRO();
  } else {
    mesh = PlanetMats.createPlanet(d);
  }

  mesh.userData = { name: d.name };
  if (['Earth', 'Moon', 'Mars', 'HWO'].includes(d.name)) {
    const rSz = d.name === 'HWO' ? 5 : (d.size * 1.6); // Custom size adjustments
    const ret = createCornerReticle(Math.max(rSz, 3.5));
    mesh.add(ret);
    mesh.userData.reticle = ret;
  }
  scene.add(mesh);
  
  bodies[d.name] = { 
    mesh, 
    orbit: d.orbit, 
    speed: d.speed, 
    angle: Math.random() * Math.PI * 2, 
    isMoon: d.isMoon,
    parent: d.parent,
    moonDist: d.moonDist || 10,
    onSurface: d.onSurface || false,
    isSatellite: d.isSatellite || false,
    isLagrange: d.isLagrange || false
  };
  
  if (!d.isMoon) {
    const points = [];
    const segments = 256;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * d.orbit, 0, Math.sin(a) * d.orbit));
    }
    
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const orbitMat = new THREE.LineDashedMaterial({
      color: 0x8fb0c4, transparent: true, opacity: 0.18, dashSize: 3, gapSize: 2, linewidth: 1
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    orbitLine.computeLineDistances();
    orbitLine.renderOrder = 999;
    scene.add(orbitLine);
    orbits.push(orbitLine);
    
  } else if (d.parent && !d.onSurface && !d.isLagrange) {
    const points = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const a = (i / segments) * Math.PI * 2;
      points.push(new THREE.Vector3(Math.cos(a) * d.moonDist, 0, Math.sin(a) * d.moonDist));
    }
    
    const moonOrbitGeo = new THREE.BufferGeometry().setFromPoints(points);
    const moonOrbitMat = new THREE.LineDashedMaterial({
      color: 0x6e8494, transparent: true, opacity: 0.12, dashSize: 2, gapSize: 1.5
    });
    const moonOrbitLine = new THREE.Line(moonOrbitGeo, moonOrbitMat);
    moonOrbitLine.computeLineDistances();
    moonOrbitLine.renderOrder = 999;
    scene.add(moonOrbitLine);
    moonOrbits.push({line: moonOrbitLine, parent: d.parent});
  }
  
  if (d.hasRing) {
    PlanetMats.addRing(mesh, d.size);
  }
});


let isAnimating = true;
let viperManualControl = false;
let roverPOVMode = false;
let roverCameraOffset = new THREE.Vector3(0, 2, 5);
let selectedBody = null;
let pausedPlanets = false;
let rotateMode = true;
let panMode = false;
let animationSpeed = 0.5;
let cameraFollowTarget = null;
let moonViperAngle = 0;
let moonLROAngle = 0;
let starshipVerticalPos = 0;
let starshipDirection = 1; // 1 for up, -1 for down

let lastFrameT = 0;
function animate() {
  requestAnimationFrame(animate);
  const tNow = performance.now() * 0.001;
  // clamp the frame delta: degenerate clocks (0 or negative) fall back to
  // a nominal 60fps step, long stalls cap at 50ms so physics stays stable
  const rawDt = tNow - lastFrameT;
  const dtFrame = (lastFrameT && rawDt > 0.001) ? Math.min(0.05, rawDt) : 0.016;
  lastFrameT = tNow;
  SpaceEnv.update(tNow);
  PlanetMats.update(tNow);

  if (moonSurfaceActive) {
    const legendEl = document.getElementById('legendText');
    
    // --- START OF FIX ---
    if (isMobileDevice) {
        // MOBILE ONLY: Show the simple layout you liked before
        if (roverPOVMode) {
          legendEl.innerHTML = `<span class="legend-title">🎮 Rover Controls</span><strong>VIPER Rover POV</strong> – 🪨 Rocks Collected: ${window.rocksCollected || 0}/15 · Use Arrow Keys: ↑ Forward · ↓ Backward · ← Turn Left · → Turn Right · Spacebar: Speed Boost`;
        } else {
          legendEl.innerHTML = '<span class="legend-title">🌕 Moon Surface</span><strong>Click objects</strong> to view details · <strong>Click Earth</strong> to return · <strong>Drag</strong> to rotate · <strong>Pinch</strong> to zoom';
        }
    } else {
        // LAPTOP ONLY: Only update the "Rocks Collected" text if needed, 
        // otherwise let the HTML layout stay as it is.
        if (roverPOVMode) {
            legendEl.innerHTML = `<div style="text-align:center; font-weight:bold;">🎮 ROVER MODE: 🪨 ${window.rocksCollected || 0}/15 Rocks Collected</div>`;
        }
        // If not in roverPOVMode, we do NOTHING here. 
        // This keeps your "How to Explore" HTML visible.
    }
    
    // Update rover POV camera if active
    if (roverPOVMode && moonViper) {
      const roverPos = moonViper.position.clone();
      const roverForward = new THREE.Vector3(0, 0, -1).applyQuaternion(moonViper.quaternion);
      const cameraPos = roverPos.clone().sub(roverForward.multiplyScalar(5)).add(new THREE.Vector3(0, 2, 0));
      moonCamera.position.copy(cameraPos);
      moonCamera.lookAt(roverPos.clone().add(roverForward.multiplyScalar(3)).add(new THREE.Vector3(0, 1, 0)));
    }
    
    // Animate Moon surface objects
    // Animate Moon surface objects
    if (isAnimating && !pausedPlanets) {

// Rover driving: velocity + inertia physics, terrain following, chassis
// tilt, wheel spin, dust and wheel tracks (moon-mission.js)
if (roverPOVMode && moonViper) {
    const spd = MoonMission.stepRover(moonViper, roverState, roverBoost, animationSpeed, dtFrame);
    MoonMission.updateHUD(moonViper, spd, window.rocksCollected);
}

// VIPER rover - automatic control only if NOT in POV mode
if (!viperManualControl && !roverPOVMode) {
        moonViperAngle += 0.001 * animationSpeed;
        const roverRadius = 12;
        moonViper.position.x = Math.cos(moonViperAngle) * roverRadius;
        moonViper.position.z = Math.sin(moonViperAngle) * roverRadius;
        moonViper.position.y = MoonMission.heightAt(moonViper.position.x, moonViper.position.z);
        moonViper.rotation.y = moonViperAngle + Math.PI / 2;
      }
      MoonMission.updateDust(dtFrame);
      // Check for rock collection
      if (window.moonRocks) {
        window.moonRocks.forEach(rock => {
          if (!rock.userData.collected) {
            const distance = moonViper.position.distanceTo(rock.position);
            if (distance < 2) {
              rock.userData.collected = true;
              window.rocksCollected++;
              
              // Collection animation - make rover flash green
              window.viperIsGlowing = true; // <--- ADD THIS FLAG
              
              moonViper.traverse(child => {
                if (child.material) {
                  if (child.material.emissive) {
                    child.material.emissive.setHex(0x00ff00);
                    child.material.emissiveIntensity = 2.0;
                  }
                  if (child.material.color) {
                    child.material.color.setHex(0x00ff00);
                  }
                }
              });

              setTimeout(() => {
                window.viperIsGlowing = false;
                moonViper.traverse(child => {
                  if (child.material) {
                    if (child.material.emissive) {
                      child.material.emissive.setHex(0x999999);
                      child.material.emissiveIntensity = 0.05;
                    }
                    if (child.material.color) {
                      child.material.color.setHex(0x999999);
                    }
                  }
                });
              }, 500);
              
              const startScale = rock.scale.clone();
              const startY = rock.position.y;
              let animProgress = 0;
              
              function animateCollection() {
                animProgress += 0.04;
                if (animProgress < 1) {
                  // Float up and spin
                  rock.position.y = startY + Math.sin(animProgress * Math.PI) * 3;
                  const scale = 1.2 - animProgress * 1.2;
                  rock.scale.set(
                    startScale.x * scale,
                    startScale.y * scale,
                    startScale.z * scale
                  );
                  rock.rotation.y += 0.3;
                  rock.rotation.x += 0.2;
                  
                  // Glow effect
                  if (rock.material.emissive) {
                    rock.material.emissive.setHex(0xffaa00);
                    rock.material.emissiveIntensity = 0.5 * (1 - animProgress);
                  }
                  
                  requestAnimationFrame(animateCollection);
                } else {
                  moonScene.remove(rock);
                }
              }
              animateCollection();
              
              
              // Update legend with collection count
              const legendEl = document.getElementById('legendText');
              if (roverPOVMode) {
                legendEl.innerHTML = `<span class="legend-title">🎮 Rover Controls</span><strong>VIPER Rover POV</strong> – 🪨 Rocks Collected: ${window.rocksCollected}/15 · Use Arrow Keys: ↑ Forward · ↓ Backward · ← Turn Left · → Turn Right · Spacebar: Speed Boost`;
              }
            }
          }
        });
      }
      
      // Starship slow takeoff and landing
      starshipVerticalPos += 0.015 * animationSpeed * starshipDirection;
      if (starshipVerticalPos > 15) {
        starshipDirection = -1;
      } else if (starshipVerticalPos < 0) {
        starshipDirection = 1;
        starshipVerticalPos = 0;
      }
      moonStarship.position.y = starshipVerticalPos;

      // LRO flying overhead in circular orbit
      moonLROAngle += 0.008 * animationSpeed;
      const lroRadius = 35;
      const lroHeight = 20;
      moonLRO.position.x = Math.cos(moonLROAngle) * lroRadius;
      moonLRO.position.y = lroHeight;
      moonLRO.position.z = Math.sin(moonLROAngle) * lroRadius;
      
      const lookAhead = new THREE.Vector3(
        Math.cos(moonLROAngle + 0.1) * lroRadius,
        lroHeight,
        Math.sin(moonLROAngle + 0.1) * lroRadius
      );
      moonLRO.lookAt(lookAhead);
      
      moonEarth.rotation.y += 0.001;
    }
    moonRenderer.render(moonScene, moonCamera);
    return;
  } else {
    // --- ONLY OVERWRITE ON MOBILE ---
    if (isMobileDevice) {
        const legendEl = document.getElementById('legendText');
        legendEl.innerHTML = `
    <div style="margin-bottom:1px;">• Objects with yellow reticles are linked to projects. Click them to view details.</div>
    <div style="margin-bottom:1px;">• Use the bottom bar to pause, play, change speed or reset the animation.</div>
    <div style="margin-bottom:7px;">• When driving the lunar rover, click on play and use arrows of the bottom bar.</div>
`;
    }
    // Laptop (else) does nothing here, allowing your manual HTML to stay as it is.
  }
  
  // Original solar system animation
  if (isAnimating && !pausedPlanets) {

    // Animate Sun Reticle
    if (sun.userData.reticle) {
      sun.userData.reticle.lookAt(camera.position);
      sun.userData.reticle.material.opacity = 0.7 + Math.sin(Date.now() * 0.0015) * 0.3;
    }

    Object.entries(bodies).forEach(([name, b]) => {
      if (b.orbit > 0) {
        b.angle += b.speed * animationSpeed;
        
        if (b.isMoon && b.parent) {
          const parentBody = bodies[b.parent];
          if (parentBody) {
            if (b.isLagrange) {
              const earthAngle = parentBody.angle;
              const l2Distance = 50;
              
              b.mesh.position.x = parentBody.mesh.position.x + Math.cos(earthAngle) * l2Distance;
              b.mesh.position.z = parentBody.mesh.position.z + Math.sin(earthAngle) * l2Distance;
              b.mesh.position.y = 0;
              
              const orbitRadius = 5;
              const orbitSpeed = b.angle * 0.5;
              b.mesh.position.x += Math.cos(orbitSpeed) * orbitRadius;
              b.mesh.position.z += Math.sin(orbitSpeed) * orbitRadius;
              
              b.mesh.rotation.y += 0.001;
              
            } else if (b.onSurface) {
              const parentRadius = parentBody.mesh.geometry && parentBody.mesh.geometry.parameters 
                ? parentBody.mesh.geometry.parameters.radius 
                : 2.5;
              
              const surfaceAngle = name === 'VIPER' ? b.angle * 0.15 : b.angle * 0.2;
              const heightOffset = name === 'VIPER' ? 0.13 : 0.4;
              
              const orbitPhase = parentBody.angle || 0;
              const localAngle = surfaceAngle + orbitPhase;
              
              const x = Math.cos(localAngle) * Math.sin(Math.PI / 4);
              const y = Math.sin(Math.PI / 4);
              const z = Math.sin(localAngle) * Math.sin(Math.PI / 4);
              
              const surfacePoint = new THREE.Vector3(x, y, z).normalize().multiplyScalar(parentRadius);
              
              b.mesh.position.copy(parentBody.mesh.position).add(surfacePoint);
              b.mesh.position.y += heightOffset;
              
              const normal = surfacePoint.clone().normalize();
              b.mesh.up.copy(normal);
              
              const forward = new THREE.Vector3(-Math.sin(localAngle), 0, Math.cos(localAngle));
              const target = b.mesh.position.clone().add(forward);
              b.mesh.lookAt(target);
              
            } else if (b.isSatellite) {
              const orbitSpeed = 12;
              b.mesh.position.x = parentBody.mesh.position.x + Math.cos(b.angle * orbitSpeed) * b.moonDist;
              b.mesh.position.y = parentBody.mesh.position.y + Math.sin(b.angle * orbitSpeed * 0.5) * (b.moonDist * 0.3);
              b.mesh.position.z = parentBody.mesh.position.z + Math.sin(b.angle * orbitSpeed) * b.moonDist;
            } else {
              const moonSpeed = 8;
              b.mesh.position.x = parentBody.mesh.position.x + Math.cos(b.angle * moonSpeed) * b.moonDist;
              b.mesh.position.y = parentBody.mesh.position.y;
              b.mesh.position.z = parentBody.mesh.position.z + Math.sin(b.angle * moonSpeed) * b.moonDist;
            }
          }
        } else if (!b.isMoon) {
          b.mesh.position.x = Math.cos(b.angle) * b.orbit;
          b.mesh.position.z = Math.sin(b.angle) * b.orbit;
        }
      }
      
      // Animate Planet Reticles
      if (b.mesh.userData.reticle) {
        b.mesh.userData.reticle.lookAt(camera.position);
        b.mesh.userData.reticle.material.opacity = 0.7 + Math.sin(Date.now() * 0.0015) * 0.3;
      }

      if (b.mesh.rotation && !b.onSurface && !b.isLagrange) {
        b.mesh.rotation.y += 0.002;
      }
    });
    
    moonOrbits.forEach(mo => {
      const parent = bodies[mo.parent];
      if (parent) {
        mo.line.position.copy(parent.mesh.position);
      }
    });
  }
  
  if (cameraFollowTarget && bodies[cameraFollowTarget]) {
    const target = bodies[cameraFollowTarget].mesh.position;
    const offset = new THREE.Vector3().subVectors(camera.position, target);
    const distance = offset.length();
    offset.normalize().multiplyScalar(distance);
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  }
  
  renderer.render(scene, camera);
}

animate();

// Initialize raycaster and mouse BEFORE event listeners
let dragging = false, prevX = 0, prevY = 0;
let isDragging = false;

// Reset dragging state when mouse leaves canvas
canvas.addEventListener('mouseleave', () => {
  dragging = false;
  isDragging = false;
});

// Get moonCanvas reference early
const moonCanvas = document.getElementById('moonSurface');

moonCanvas.addEventListener('mouseleave', () => {
  dragging = false;
  isDragging = false;
  const hoverHint = document.getElementById('hoverHint');
  if (hoverHint) hoverHint.classList.remove('active');
});


canvas.addEventListener('mousedown', e => {
  isDragging = false;
  dragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
  canvas.style.cursor = 'grabbing';
});

// Moon surface hover detection - GLOBAL
// Store original colors for Moon objects
const moonObjectColors = {
  'Starship': 0xf0f0f0,
  'VIPER': 0x999999,
  'LRO': 0xdddddd,
  'Earth': 0x4a90e2
};

// Moon surface hover detection
moonCanvas.addEventListener('mousemove', e => {
  if (!moonSurfaceActive) return;
  // if (moonSurfaceActive) return;
  
  if (isDragging) return;  // Use isDragging instead of dragging
  
  const rect = moonCanvas.getBoundingClientRect();
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  
  raycaster.setFromCamera(mouse, moonCamera);
  const moonHoverables = [moonStarship, moonViper, moonLRO, moonEarth].filter(obj => obj);
  const moonHits = raycaster.intersectObjects(moonHoverables, true);
  
  const hoverHint = document.getElementById('hoverHint');
  
  // Always reset ALL objects first
  [moonStarship, moonViper, moonLRO].forEach(obj => {
    if (obj) {
      // If this is the VIPER and it is currently doing the green flash, skip resetting it
      if (obj === moonViper && window.viperIsGlowing) return;

      obj.traverse(child => {
        if (child.material && child.material.emissive) {
          const objName = obj.userData.name;
          const originalColor = moonObjectColors[objName] || 0x888888;
          child.material.emissive.setHex(originalColor);
          child.material.emissiveIntensity = 0.05;
        }
      });
    }
  });
  
  if (moonEarth && moonEarth.material) {
    if (moonEarth.material.emissive) {
      moonEarth.material.emissive.setHex(moonObjectColors['Earth']);
      moonEarth.material.emissiveIntensity = 0.3;
    }
  }
  
  // Clear publication highlights
  document.querySelectorAll('.pub-card').forEach(card => {
    card.classList.remove('highlighted');
  });
  
  // Now highlight hovered object - NO dragging check here!
  if (moonHits.length > 0) {
    let objName = moonHits[0].object.userData.name;
    if (!objName && moonHits[0].object.parent) {
      objName = moonHits[0].object.parent.userData.name;
    }
    if (!objName && moonHits[0].object.parent && moonHits[0].object.parent.parent) {
      objName = moonHits[0].object.parent.parent.userData.name;
    }
    
    if (objName) {
      // Find the group object
      let targetGroup = null;
      if (objName === 'Starship') targetGroup = moonStarship;
      else if (objName === 'VIPER') targetGroup = moonViper;
      else if (objName === 'LRO') targetGroup = moonLRO;
      else if (objName === 'Earth') targetGroup = moonEarth;
      
      // Highlight with bright white glow
      if (targetGroup && targetGroup !== moonEarth) {
        targetGroup.traverse(child => {
          if (child.material && child.material.emissive) {
            child.material.emissive.setHex(0xffffff);
            child.material.emissiveIntensity = 1.5;
          }
        });
      } else if (targetGroup === moonEarth) {
        if (moonEarth.material.emissive) {
          moonEarth.material.emissive.setHex(0xffffff);
          moonEarth.material.emissiveIntensity = 2.0;
        }
      }
      
      moonCanvas.style.cursor = 'pointer';
      highlightPublication(objName);
      
      // Show hints
      if (hoverHint) {
        let hintText = '';
        if (objName === 'Starship') hintText = ' Click to view Starship publication';
        else if (objName === 'VIPER') hintText = roverPOVMode ? ' Click to view VIPER publication' : ' Click to enter rover driving mode';
        else if (objName === 'LRO') hintText = ' Click to view LRO publication';
        else if (objName === 'Earth') hintText = ' Click to return to Earth view';
        
        if (hintText) {
          hoverHint.textContent = hintText;
          hoverHint.style.left = e.clientX + 15 + 'px';
          hoverHint.style.top = e.clientY + 15 + 'px';
          hoverHint.classList.add('active');
        }
      }
    }
  } else {
    moonCanvas.style.cursor = 'default';
    if (hoverHint) hoverHint.classList.remove('active');
  }
});
 

moonCanvas.addEventListener('mousedown', e => {
  if (!moonSurfaceActive) return;
  isDragging = false;
  dragging = true;
  prevX = e.clientX;
  prevY = e.clientY;
  moonCanvas.style.cursor = 'grabbing';
});

moonCanvas.addEventListener('wheel', e => {
  if (!moonSurfaceActive) return;
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 0.85 : 1.15;
  const direction = new THREE.Vector3();
  moonCamera.getWorldDirection(direction);
  
  moonCamera.position.add(direction.multiplyScalar((delta - 1) * 10));
  
  // Clamp camera distance
  const distance = moonCamera.position.length();
  if (distance < 3) {
    moonCamera.position.normalize().multiplyScalar(3);
  }
  if (distance > 150) {
    moonCamera.position.normalize().multiplyScalar(150);
  }
}, { passive: false });

document.addEventListener('mousemove', e => {
  if (!dragging) return;
  
  const dx = e.clientX - prevX;
  const dy = e.clientY - prevY;
  
  if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
    isDragging = true;
  }
  
  // Moon surface camera controls
  if (moonSurfaceActive) {
    const rotSpeed = 0.005;
    
    if (panMode || e.shiftKey) {
      const panSpeed = 0.3;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      
      moonCamera.getWorldDirection(right);
      right.cross(moonCamera.up).normalize();
      up.copy(moonCamera.up).normalize();
      
      right.multiplyScalar(-dx * panSpeed);
      up.multiplyScalar(dy * panSpeed);
      
      moonCamera.position.add(right);
      moonCamera.position.add(up);
    } else {
      const phi = dx * rotSpeed;
      const theta = dy * rotSpeed;
      
      const target = new THREE.Vector3(0, 0, 0);
      const offset = new THREE.Vector3().subVectors(moonCamera.position, target);
      const r = offset.length();
      
      let sphericalTheta = Math.acos(offset.y / r);
      let sphericalPhi = Math.atan2(offset.z, offset.x);
      
      sphericalPhi -= phi;
      sphericalTheta = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalTheta - theta));
      
      moonCamera.position.x = target.x + r * Math.sin(sphericalTheta) * Math.cos(sphericalPhi);
      moonCamera.position.y = target.y + r * Math.cos(sphericalTheta);
      moonCamera.position.z = target.z + r * Math.sin(sphericalTheta) * Math.sin(sphericalPhi);
      moonCamera.lookAt(target);
    }
    
    prevX = e.clientX;
    prevY = e.clientY;
    return;
  }
  
  // Original solar system controls
  if (panMode || e.shiftKey) {
    const panSpeed = 0.5;
    const right = new THREE.Vector3();
    const up = new THREE.Vector3();
    
    camera.getWorldDirection(right);
    right.cross(camera.up).normalize();
    up.copy(camera.up).normalize();
    
    right.multiplyScalar(-dx * panSpeed);
    up.multiplyScalar(dy * panSpeed);
    
    camera.position.add(right);
    camera.position.add(up);
    
    cameraFollowTarget = null;
    
  } else {
    const rotSpeed = 0.005;
    const phi = dx * rotSpeed;
    const theta = dy * rotSpeed;
    
    const target = cameraFollowTarget && bodies[cameraFollowTarget] 
      ? bodies[cameraFollowTarget].mesh.position 
      : getCurrentViewTarget(); 
    
    const offset = new THREE.Vector3().subVectors(camera.position, target);
    const r = offset.length();
    
    let sphericalTheta = Math.acos(offset.y / r);
    let sphericalPhi = Math.atan2(offset.z, offset.x);
    
    sphericalPhi -= phi;
    sphericalTheta = Math.max(0.1, Math.min(Math.PI - 0.1, sphericalTheta - theta));
    
    camera.position.x = target.x + r * Math.sin(sphericalTheta) * Math.cos(sphericalPhi);
    camera.position.y = target.y + r * Math.cos(sphericalTheta);
    camera.position.z = target.z + r * Math.sin(sphericalTheta) * Math.sin(sphericalPhi);
    camera.lookAt(target);
  }
  
  prevX = e.clientX;
  prevY = e.clientY;
});

document.addEventListener('mouseup', () => {
  dragging = false;
  canvas.style.cursor = 'default';
  moonCanvas.style.cursor = 'default';
  setTimeout(() => { isDragging = false; }, 50);
});

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  
  const delta = e.deltaY > 0 ? 1.35 : 0.75;
  const zoomMultiplier = Math.abs(e.deltaY) > 100 ? 1.5 : 1.0;  // Faster for larger movements
  const finalDelta = (e.deltaY > 0 ? 1.35 : 0.75) * zoomMultiplier;
  // const delta = e.deltaY > 0 ? 1.15 : 0.85; 
//const delta = e.deltaY > 0 ? 1.08 : 0.92;
  
  const direction = new THREE.Vector3();
  camera.getWorldDirection(direction);
  const distance = camera.position.length();
  const currentTarget = camera.position.clone().add(direction.multiplyScalar(distance * 0.3));
  
  const offset = new THREE.Vector3().subVectors(camera.position, currentTarget);
  offset.multiplyScalar(finalDelta);
  
  const len = offset.length();
  if (len < 10) offset.normalize().multiplyScalar(10);
  if (len > 1200) offset.normalize().multiplyScalar(1200);
  
  camera.position.copy(currentTarget).add(offset);
  camera.lookAt(currentTarget);
  
}, { passive: false });

const raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.5;
const mouse = new THREE.Vector2();

canvas.addEventListener('click', e => {
  // Mobile: Don't trigger click if we were rotating/panning
  if (isMobileDevice && isTouchInteracting) {
    isTouchInteracting = false;
    return;
  }
  if (isDragging) return;
  
  const rect = canvas.getBoundingClientRect();
  // Support both mouse and touch events
  const clientX = e.clientX || (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
  const clientY = e.clientY || (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  
  // Handle Moon surface clicks
  if (moonSurfaceActive) {
    raycaster.setFromCamera(mouse, moonCamera);
    const moonClickables = [moonStarship, moonViper, moonLRO, moonEarth].filter(obj => obj);
    const moonHits = raycaster.intersectObjects(moonClickables, true);
    
    if (moonHits.length > 0) {
      let objName = moonHits[0].object.userData.name;
      if (!objName && moonHits[0].object.parent) {
        objName = moonHits[0].object.parent.userData.name;
      }
      if (!objName && moonHits[0].object.parent && moonHits[0].object.parent.parent) {
        objName = moonHits[0].object.parent.parent.userData.name;
      }
      
      // Check if Earth was clicked - exit Moon view
      if (moonEarth && (moonHits[0].object === moonEarth || moonHits[0].object.parent === moonEarth)) {
        moonSurfaceActive = false;
        document.getElementById('moonSurface').classList.remove('active');
        MoonMission.hideMission();
        
        const earthPub = PUBS.find(p => p.body === 'Earth');
        if (earthPub) {
          showDetail(earthPub);
          highlightPublication('Earth');
          setTimeout(() => zoomToBody('Earth'), 100);
        }
        return;
      }
      
      if (objName) {
        const pub = PUBS.find(p => p.body === objName);
        if (pub) {
          showDetail(pub);
          highlightPublication(objName);
          // Stay in Moon view for Starship, VIPER, LRO
        }
      }
    }
    return;
  }
  
  // Original solar system click handling continues...
  
  // Original solar system click handling
  raycaster.setFromCamera(mouse, camera);
  const clickables = Object.values(bodies).map(b => b.mesh).concat([sun]);
  const hits = raycaster.intersectObjects(clickables, true);
  
  if (hits.length > 0) {
    let bodyName = hits[0].object.userData.name;
    if (!bodyName && hits[0].object.parent && hits[0].object.parent.userData) {
      bodyName = hits[0].object.parent.userData.name;
    }
    if (!bodyName && hits[0].object.parent && hits[0].object.parent.parent && hits[0].object.parent.parent.userData) {
      bodyName = hits[0].object.parent.parent.userData.name;
    }
    
    if (bodyName) {
      selectedBody = bodyName;
      
      const bodyInfo = bodyData.find(b => b.name === bodyName);
      const targetBody = bodyInfo && bodyInfo.body ? bodyInfo.body : bodyName;
      
      zoomToBody(bodyName);
      
      const pub = PUBS.find(p => p.body === targetBody);
      if (pub) {
        setTimeout(() => showDetail(pub), 300);
        highlightPublication(targetBody);
      } else {
        hideDetail();
      }
    }
  }
});

// Disable hover detection on mobile (too thin for touch)
if (!isMobileDevice) {
  canvas.addEventListener('mousemove', e => {
    if (dragging) return;
    if (moonSurfaceActive) return; 
    
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    const clickables = Object.values(bodies).map(b => b.mesh).concat([sun]);
    const hits = raycaster.intersectObjects(clickables, true);
    
    Object.keys(bodies).forEach(name => unhighlightBody(name));
    unhighlightBody('Sun');
    
    const hoverHint = document.getElementById('hoverHint');
    
    if (hits.length > 0) {
      let bodyName = hits[0].object.userData.name;
      if (!bodyName && hits[0].object.parent && hits[0].object.parent.userData) {
        bodyName = hits[0].object.parent.userData.name;
      }
      if (!bodyName && hits[0].object.parent && hits[0].object.parent.parent && hits[0].object.parent.parent.userData) {
        bodyName = hits[0].object.parent.parent.userData.name;
      }
      
      if (bodyName) {
        highlightBody(bodyName);
        
        const bodyInfo = bodyData.find(b => b.name === bodyName);
        const targetBody = bodyInfo && bodyInfo.body ? bodyInfo.body : bodyName;
        
        highlightPublication(targetBody);
        canvas.style.cursor = 'pointer';
        
        // Show hint for Moon
        if (bodyName === 'Moon') {
          hoverHint.textContent = 'Click to explore Moon surface view';
          hoverHint.style.left = e.clientX + 15 + 'px';
          hoverHint.style.top = e.clientY + 15 + 'px';
          hoverHint.classList.add('active');
        } else {
          hoverHint.classList.remove('active');
        }
      }
    } else {
      canvas.style.cursor = 'default';
      hoverHint.classList.remove('active');
      document.querySelectorAll('.pub-card').forEach(card => {
        card.classList.remove('highlighted');
      });
    }
  });
}


function zoomToBody(name) {
  // Check if clicking Moon - activate surface view
  if (name === 'Moon' ) {
     if (!moonSurfaceActive) {
      moonSurfaceActive = true;
      
      // Reset all highlights in main solar system
      Object.keys(bodies).forEach(name => unhighlightBody(name));
      unhighlightBody('Sun');
      document.querySelectorAll('.pub-card').forEach(card => {
        card.classList.remove('highlighted');
      });
 
      // Hide any active hints
      const hoverHint = document.getElementById('hoverHint');
      if (hoverHint) hoverHint.classList.remove('active');

      
      document.getElementById('moonSurface').classList.add('active');
      MoonMission.showMission(exitMoonMission);
      if (!moonScene) initMoonSurface();
      // Force animations to play in Moon view
      if (pausedPlanets) {
        pausedPlanets = false;
        document.getElementById('btnPause').textContent = '⏸';
      }
    }
    return;
  }
  
  const body = bodies[name] || (name === 'Sun' ? { mesh: sun } : null);
  if (!body) return;
  
  const targetPos = body.mesh.position.clone();
  
  let bodySize = 6;
  if (name === 'Sun') bodySize = 18;
  else if (name === 'Jupiter') bodySize = 14;
  else if (name === 'Saturn') bodySize = 12;
  else if (name === 'ISS') bodySize = 4;
  else if (name === 'HWO') bodySize = 3;
  else if (name === 'Earth') bodySize = 7;
  else if (name === 'Starship') bodySize = 1.5;
  else if (name === 'VIPER') bodySize = 1;
  else if (name === 'LRO') bodySize = 1.2;
  
  let distance = Math.max(30, bodySize * 6);
  if (name === 'ISS' || name === 'HWO' || name === 'Starship' || name === 'VIPER' || name === 'LRO') {
    distance = bodySize * 8;
  }
  
  const direction = new THREE.Vector3().subVectors(camera.position, targetPos).normalize();
  const newCamPos = targetPos.clone().add(direction.multiplyScalar(distance));
  
  const startPos = camera.position.clone();
  let progress = 0;
  
  cameraFollowTarget = name;
  
  function animateCamera() {
    progress += 0.03;
    if (progress <= 1) {
      camera.position.lerpVectors(startPos, newCamPos, progress);
      camera.lookAt(targetPos);
      requestAnimationFrame(animateCamera);
    }
  }
  animateCamera();
}

document.getElementById('btnReset').addEventListener('click', () => {
  if (moonSurfaceActive) {
    moonSurfaceActive = false;
    roverPOVMode = false;
    viperManualControl = false;

    // RESET ROCK VISIBILITY
    if (window.moonRocks) {
      window.moonRocks.forEach(rock => {
        rock.visible = false;
      });
    }
    document.getElementById('moonSurface').classList.remove('active');
        MoonMission.hideMission();
    
    // Ensure we switch back to standard controls
    toggleRoverControls(false);

    // Reset rocks
    if (window.moonRocks) {
      window.moonRocks.forEach(rock => {
        if (rock.userData.collected) {
          rock.userData.collected = false;
          rock.scale.set(1, 1, 1);
          if (!moonScene.children.includes(rock)) {
            moonScene.add(rock);
          }
        }
      });
      window.rocksCollected = 0;
    }
  }
  
  camera.position.set(250, 200, 250);
  camera.lookAt(0, 0, 0);
  selectedBody = null;
  pausedPlanets = false;
  cameraFollowTarget = null;
  hideDetail();
  
  document.querySelectorAll('.pub-card').forEach(card => {
    card.classList.remove('highlighted');
  });
  
  document.getElementById('btnPause').textContent = '⏸';
});

document.getElementById('btnPause').addEventListener('click', e => {
  pausedPlanets = !pausedPlanets;
  e.target.textContent = pausedPlanets ? '▶' : '⏸';
});

const speedBtn = document.getElementById('btnSpeed');
const speedDropdown = document.getElementById('speedDropdown');

// Toggle dropdown
speedBtn.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  const isVisible = speedDropdown.style.display === 'flex';
  speedDropdown.style.display = isVisible ? 'none' : 'flex';
  speedDropdown.classList.toggle('active', !isVisible);
});

// Handle selection
document.querySelectorAll('#speedDropdown button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const speed = parseFloat(e.target.dataset.speed);
    animationSpeed = speed * 0.5; // Scale relative to base
    speedBtn.textContent = speed + 'x';
    speedDropdown.style.display = 'none';
    speedDropdown.classList.remove('active');
  });
});

// Close when clicking outside
document.addEventListener('click', (e) => {
    if(speedDropdown.style.display === 'flex' && !speedBtn.contains(e.target)) {
        speedDropdown.style.display = 'none';
        speedDropdown.classList.remove('active');
    }
});

speedBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  speedDropdown.classList.toggle('active');
});

document.querySelectorAll('#speedDropdown button').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const speed = parseFloat(e.target.dataset.speed);
    animationSpeed = speed * 0.5;
    speedBtn.textContent = speed + 'x';
    speedDropdown.classList.remove('active');
  });
});

document.addEventListener('click', () => {
  speedDropdown.classList.remove('active');
});

// Mobile: Press-and-hold zoom functionality
let zoomInterval = null;
let isZooming = false;

function performZoom(direction) {
  if (moonSurfaceActive) {
    const dir = new THREE.Vector3(0, 0, 0).sub(moonCamera.position).normalize();
    moonCamera.position.add(dir.multiplyScalar(direction * 3));
    const distance = moonCamera.position.length();
    if (distance < 3) {
      moonCamera.position.normalize().multiplyScalar(3);
    } else if (distance > 150) {
      moonCamera.position.normalize().multiplyScalar(150);
    }
  } else {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const distance = camera.position.length();
    const currentTarget = camera.position.clone().add(dir.multiplyScalar(distance * 0.3));
    const offset = new THREE.Vector3().subVectors(camera.position, currentTarget);
    offset.multiplyScalar(direction > 0 ? 0.85 : 1.15);
    const len = offset.length();
    if (len < 10) offset.normalize().multiplyScalar(10);
    if (len > 1200) offset.normalize().multiplyScalar(1200);
    camera.position.copy(currentTarget).add(offset);
    camera.lookAt(currentTarget);
  }
}

function startZoom(direction) {
  if (isZooming) return;
  isZooming = true;
  performZoom(direction); // Immediate zoom on press
  zoomInterval = setInterval(() => performZoom(direction), 50); // Continuous zoom
}

function stopZoom() {
  if (zoomInterval) {
    clearInterval(zoomInterval);
    zoomInterval = null;
  }
  isZooming = false;
}

const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');

// Mobile: Press-and-hold support
if (isMobileDevice) {
  btnZoomIn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startZoom(1);
  });
  btnZoomIn.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopZoom();
  });
  btnZoomIn.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    stopZoom();
  });
  
  btnZoomOut.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startZoom(-1);
  });
  btnZoomOut.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopZoom();
  });
  btnZoomOut.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    stopZoom();
  });
}

// Desktop: Single click
btnZoomIn.addEventListener('click', () => {
  if (!isMobileDevice) performZoom(1);
});

document.getElementById('btnZoomOut').addEventListener('click', () => {
  if (!isMobileDevice) performZoom(-1);
});

document.getElementById('btnRotate').addEventListener('click', e => {
  rotateMode = true;
  panMode = false;
  e.target.classList.add('active');
  document.getElementById('btnPan').classList.remove('active');
  // Removed automatic view rotation - view should not move when selecting button
});

document.getElementById('btnPan').addEventListener('click', e => {
  panMode = true;
  rotateMode = false;
  e.target.classList.add('active');
  document.getElementById('btnRotate').classList.remove('active');
});


function onWindowResize() {
  const width = leftPanel.clientWidth;
  const height = leftPanel.clientHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  
  if (moonRenderer) {
    moonCamera.aspect = width / height;
    moonCamera.updateProjectionMatrix();
    moonRenderer.setSize(width, height);
  }
}

window.addEventListener('resize', onWindowResize);



function exitMoonMission() {
  moonSurfaceActive = false;
  roverPOVMode = false;
  viperManualControl = false;
  document.getElementById('moonSurface').classList.remove('active');
  MoonMission.hideMission();
  toggleRoverControls(false);
  if (window.moonRocks) window.moonRocks.forEach(rock => { rock.visible = false; });
  const earthPub = PUBS.find(p => p.body === 'Earth');
  if (earthPub) {
    showDetail(earthPub);
    highlightPublication('Earth');
    setTimeout(() => zoomToBody('Earth'), 100);
  }
}

// Keyboard controls for VIPER rover in Moon view.
// Keys set held-state flags consumed by the physics step each frame
// (velocity + inertia in moon-mission.js) instead of teleporting the rover.
let roverBoost = false;
const KEY_TO_DIR = { ArrowUp: 'forward', ArrowDown: 'backward', ArrowLeft: 'left', ArrowRight: 'right' };

document.addEventListener('keydown', e => {
  if (!moonSurfaceActive || !moonViper) return;
  if (e.key === ' ') {
    e.preventDefault(); // prevent page scroll
    roverBoost = true;
    return;
  }
  const dir = KEY_TO_DIR[e.key];
  if (dir) {
    e.preventDefault();
    viperManualControl = true;
    roverState[dir] = true;
  }
});

document.addEventListener('keyup', e => {
  if (e.key === ' ') roverBoost = false;
  const dir = KEY_TO_DIR[e.key];
  if (dir) roverState[dir] = false;
  if (e.key.startsWith('Arrow') && !roverPOVMode) {
    // Allow automatic control to resume after a delay only if not in POV mode
    setTimeout(() => {
      viperManualControl = false;
    }, 5000);
  }
});


renderPublications();
setTimeout(() => initMoonSurface(), 500);

let globalFontScale = 1.1;
function changeGlobalTextSize(delta) {
    globalFontScale = Math.max(0.8, Math.min(1.8, globalFontScale + delta));
    document.documentElement.style.setProperty('--list-font-scale', globalFontScale);
    
    if (typeof onWindowResize === 'function') onWindowResize();
}

// --- ROVER CONTROL LOGIC ---

// State for continuous movement
const roverState = {
    forward: false,
    backward: false,
    left: false,
    right: false
};

// Function to toggle control visibility
function toggleRoverControls(showRover) {
    const stdControls = document.getElementById('standardControls');
    const rovControls = document.getElementById('roverControls');
    
    if (showRover) {
        stdControls.style.display = 'none';
        rovControls.style.display = 'flex';
    } else {
        stdControls.style.display = 'flex';
        rovControls.style.display = 'none';
    }
}

// Attach listeners to Rover Buttons
['btnRoverForward', 'btnRoverBackward', 'btnRoverLeft', 'btnRoverRight'].forEach(id => {
    const btn = document.getElementById(id);
    const direction = id.replace('btnRover', '').toLowerCase(); // forward, backward, left, right
    
    // Touch Start (Mobile) & Mouse Down (Desktop)
    const startMove = (e) => {
        e.preventDefault(); 
        roverState[direction] = true;
        viperManualControl = true;
    };
    
    // Touch End & Mouse Up
    const stopMove = (e) => {
        e.preventDefault();
        roverState[direction] = false;
    };

    btn.addEventListener('touchstart', startMove, {passive: false});
    btn.addEventListener('touchend', stopMove);
    btn.addEventListener('mousedown', startMove);
    btn.addEventListener('mouseup', stopMove);
    btn.addEventListener('mouseleave', stopMove);
});



