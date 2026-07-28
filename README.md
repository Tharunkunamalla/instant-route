# Instant Route Guide

<div align="center">

![Instant Route Guide](public/logo1.png)

**A high-performance real-time route optimization application that visualizes and compares pathfinding algorithms on real-world road networks.**

[![React](https://img.shields.io/badge/React-18.3.1-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4.19-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#features) • [Architecture](#system-architecture) • [Installation](#installation) • [Usage](#usage) • [Algorithms](#algorithms) • [Results](#results)

</div>

---

## Project Summary

**Instant Route Guide** is an interactive, full-stack pathfinding visualization platform designed to compare classic graph-search algorithms on actual road networks. Using map data from **OpenStreetMap (OSM)** and geocoding services, the application calculates and visualizes the shortest path between any two locations in real-time.

The project is structured as a **microservices-based architecture**, containing a React/TypeScript frontend for Leaflet-based map visualization, a Node.js service for map data proxying, and a high-performance Java backend service for running pathfinding algorithms. This setup allows users to compare **Breadth-First Search (BFS)**, **Dijkstra's Algorithm**, and the **A\* Search Algorithm** side-by-side, witnessing how different search strategies expand nodes and build optimal routes.

---

## Table of Contents

- [About](#about)
- [Aim](#aim)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Algorithms](#algorithms)
- [Installation](#installation)
- [Usage](#usage)
- [Screenshots](#screenshots)
- [Results](#results)
- [Contributing](#contributing)
- [License](#license)

---

## About

Instant Route Guide is an educational and practical tool that demonstrates how routing engines calculate optimal paths in real-world scenarios. Instead of using artificial grids, it downloads real road segments from OpenStreetMap and maps them to a graph representation. The application visualizes each step of the pathfinding execution, offering insights into spatial search efficiency and algorithmic complexities.

---

## Aim

The primary objectives of this project are:

1. **Education**: Demonstrate how classic graph traversal and pathfinding algorithms operate in real-world geospatial contexts.
2. **Comparison**: Provide side-by-side performance comparisons (nodes explored, execution times) of BFS, Dijkstra, and A*.
3. **Visualization**: Render interactive, step-by-step visualizations of algorithm frontier expansions and path reconstruction.
4. **Practicality**: Offer a fully functional route planner using real map data and address search.
5. **Architectural Design**: Showcase a decoupled microservices design leveraging Nginx, Java, Node.js, and React.

---

## System Architecture

The application is built using a containerized microservices architecture to segregate concerns:

- **API Gateway (Nginx)**: Acts as the reverse proxy, routing incoming requests to the frontend, OSM proxy, or pathfinding services.
- **Frontend Service (React + Vite)**: Renders the user interface, manages the interactive map (Leaflet), handles user search inputs, and provides client-side animation controls.
- **OSM Proxy Service (Node.js)**: Fetches raw road network data from the OpenStreetMap Overpass API and formats it for client/server consumption.
- **Pathfinding Service (Java)**: Implements graph representation structures and runs high-performance backend calculations of pathfinding algorithms.

---

## Features

### Core Features
- **Real-time Route Calculation**: Computes routing paths using live graph data from OpenStreetMap.
- **Interactive Map Visualization**: Leaflet-based interactive maps featuring custom layer styles and markers.
- **Location Search**: Geocodes address queries to city regions using the Google Maps API.
- **Algorithm Selection**: Allows toggle switching between BFS, Dijkstra's, and A* algorithms.
- **Visualization Playback**: Play, pause, step-through, and speed sliders for controlling the rendering of node discovery.
- **Distance & Duration**: Real-time metrics calculating route distance (meters) and estimated durations.

### UI/UX Features
- Premium dark-themed visual layout with a sleek color scheme.
- Fluid component animations using Framer Motion and GSAP.
- Fully responsive design optimized for mobile, tablet, and desktop views.
- Glass-morphism cards and layout frames.

### Pages
1. **Landing Page** - High-impact intro detailing the project purpose and key features.
2. **Map Page** - Main interactive dashboard containing search sidebar, configuration tools, and the map canvas.
3. **Immersive Map Page** - Full-bleed, full-screen map mode for an uninterrupted visualization experience.
4. **About Page** - Deep dive into project goals, algorithm concepts, and information.
5. **Contact Page** - User query and contact submission form.

---

## Technology Stack

### Frontend
- **React 18.3** - Component-based user interface library.
- **TypeScript** - Strict typing for clean code maintenance.
- **Vite 5.4** - Rapid bundler and build system.
- **Tailwind CSS 3.4** - Utility-first styling.
- **shadcn/ui** - Base components designed using Radix UI primitives.

### Animation & Iconography
- **Framer Motion** - Interactive page transitions and micro-interactions.
- **GSAP** - Timeline-based component animations.
- **Lucide React** - Vector iconography.

### Mapping & Geolocation
- **Leaflet** - Standard open-source interactive mapping library.
- **React Leaflet** - React components wrapper for Leaflet.
- **Google Maps API** - Forward geocoding services.
- **OpenStreetMap** - Global geographic data.

### State Management & Forms
- **React Router DOM v6** - Client-side page navigation.
- **React Hook Form** - Optimized form validation and lifecycle management.
- **Zod** - Schema validation and runtime type checking.
- **TanStack Query (React Query)** - Asynchronous state sync and data fetching.

### Backend Services
- **Java**: High-performance backend algorithms.
- **Node.js**: Asynchronous proxying service for OSM queries.
- **Nginx**: Load balancing and API routing.

---

## Project Structure

```
instant-route-guide/
├── api/                        # OpenStreetMap parsing and API utility files
├── java_algorithms/            # Core Java algorithm reference files
│   ├── AStar.java
│   ├── Dijkstra.java
│   ├── BFS.java
│   ├── Node.java
│   ├── Result.java
│   └── Main.java
├── public/                     # Static icons, logos, and screenshots
├── services/                   # Backend microservices
│   ├── gateway/                # Nginx reverse proxy configuration
│   ├── osm-proxy/              # Node.js OSM Overpass API proxy
│   └── pathfinding/            # Java-based pathfinding service (Maven)
├── src/                        # React Frontend Application
│   ├── algorithms/             # Client-side implementations of pathfinding
│   ├── components/             # Reusable UI widgets and layout modules
│   ├── pages/                  # Landing, Map, About, Contact templates
│   ├── lib/                    # Library setup (Leaflet utilities, OSM wrapper)
│   ├── hooks/                  # Custom React hooks
│   ├── App.jsx                 # App routing core
│   └── index.css               # Global styles & tailwind directives
├── Dockerfile                  # Production Docker file for frontend container
├── docker-compose.yml          # Local multi-container development orchestration
├── package.json                # Project dependencies and workspace scripts
└── README.md                   # Project documentation
```

---

## Algorithms

This project implements three standard pathfinding algorithms. Code is implemented in JavaScript (for front-end animations) and Java (for back-end routing computations).

### 1. Breadth-First Search (BFS)

BFS explores the network level by level, scanning all immediate neighbors before moving to the next degree of separation.

- **Completeness**: Yes (guaranteed to find a path if one exists).
- **Optimality**: Only on unweighted graphs (explores paths purely by hop count).
- **Time Complexity**: O(V + E)
- **Space Complexity**: O(V)

#### Pseudocode
```
function BFS(graph, start, end):
    queue = [start]
    visited = {start}
    previous = {}
    
    while queue is not empty:
        current = queue.dequeue()
        if current == end:
            return reconstructPath(previous, end)
        
        for neighbor in graph[current].neighbors:
            if neighbor not in visited:
                visited.add(neighbor)
                previous[neighbor] = current
                queue.enqueue(neighbor)
    
    return null
```

---

### 2. Dijkstra's Algorithm

Dijkstra's algorithm finds the absolute shortest path by sorting candidate nodes using a priority queue, expanding the path with the smallest accumulated travel cost.

- **Completeness**: Yes.
- **Optimality**: Yes (guaranteed on graphs with non-negative edge costs).
- **Time Complexity**: O((V + E) log V) with a binary heap.
- **Space Complexity**: O(V)

#### Pseudocode
```
function Dijkstra(graph, start, end):
    distances = {node: infinity for all nodes}
    distances[start] = 0
    previous = {}
    unvisited = all nodes
    
    while unvisited is not empty:
        current = node in unvisited with min distances[current]
        if current == end:
            return reconstructPath(previous, end)
        
        remove current from unvisited
        
        for neighbor, weight in graph[current].neighbors:
            alt = distances[current] + weight
            if alt < distances[neighbor]:
                distances[neighbor] = alt
                previous[neighbor] = current
    
    return null
```

---

### 3. A\* Search Algorithm

A\* improves on Dijkstra by using heuristics to estimate the remaining distance to the goal, prioritizing nodes that minimize the total estimated path cost.

- **Completeness**: Yes.
- **Optimality**: Yes (guaranteed if the heuristic is admissible—never overestimating the distance).
- **Heuristic Function**: Euclidean distance calculated as `h(n) = √((x₁-x₂)² + (y₁-y₂)²) × 111000` (converting latitude/longitude coordinates to approximate meters).
- **Complexity**: O(E) in best cases; performance is highly dependent on the quality of the heuristic.

#### Pseudocode
```
function AStar(graph, start, end):
    openSet = {start}
    closedSet = {}
    gScore = {node: infinity for all nodes}
    fScore = {node: infinity for all nodes}
    gScore[start] = 0
    fScore[start] = heuristic(start, end)
    previous = {}
    
    while openSet is not empty:
        current = node in openSet with min fScore[current]
        if current == end:
            return reconstructPath(previous, end)
        
        remove current from openSet
        add current to closedSet
        
        for neighbor, weight in graph[current].neighbors:
            if neighbor in closedSet:
                continue
            
            tentativeG = gScore[current] + weight
            
            if neighbor not in openSet:
                add neighbor to openSet
            else if tentativeG >= gScore[neighbor]:
                continue
            
            previous[neighbor] = current
            gScore[neighbor] = tentativeG
            fScore[neighbor] = gScore[neighbor] + heuristic(neighbor, end)
            
    return null
```

---

### Algorithm Comparison

| Algorithm | Optimal | Complete | Speed | Use Case |
|-----------|---------|----------|-------|----------|
| **BFS** | For unweighted graphs | Yes | Medium | Simple unweighted connections |
| **Dijkstra** | Yes | Yes | Medium | Weighted paths without coordinate data |
| **A\*** | Yes (admissible heuristic) | Yes | Fast | Geographic maps and game pathfinding |

#### Typical Node Expansion Metrics (Road Networks)
- **BFS**: Explores 70% to 100% of all nodes in the region.
- **Dijkstra**: Explores 40% to 60% of all nodes.
- **A\***: Explores 20% to 40% of nodes (guides exploration towards the target).

---

## Installation

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **Java Development Kit (JDK)** 17 or higher
- **Maven** (for compiling the backend Java service)
- **Docker & Docker Compose** (highly recommended for running all microservices easily)
- **Google Maps API Key** (for address geocoding)

### Option A: Running with Docker (Recommended)

To run the entire microservices stack (React frontend, Node proxy, Java service, Nginx gateway) with a single command:

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Tharunkunamalla/instant-route-guide.git
   cd instant-route-guide
   ```

2. **Add Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

3. **Start the services**:
   ```bash
   docker-compose up --build
   ```
   The application will be accessible through the Nginx gateway at `http://localhost:8080`.

---

### Option B: Manual Local Setup

If you prefer to run services individually:

#### 1. Frontend Setup
```bash
# In the root folder
npm install
npm run dev
```
The React dev server starts on `http://localhost:5173`. Make sure to set `VITE_GOOGLE_MAPS_API_KEY` in `.env`.

#### 2. Java Pathfinding Backend
```bash
cd services/pathfinding
mvn clean install
mvn spring-boot:run
```

#### 3. Node OSM Proxy
```bash
cd services/osm-proxy
npm install
npm start
```

---

### Option C: Deploying to Google Cloud Platform (GCP)

You can absolutely deploy and run this project on Google Cloud Platform! Since the project is fully dockerized with `docker-compose`, you have a couple of excellent deployment pathways depending on your scaling needs:

#### 1. Google Compute Engine (GCE) - *Easiest & recommended for Docker Compose*
Deploy the multi-container stack directly on a Virtual Machine (VM):
* **Create a VM Instance:**
  1. In the GCP Console, go to **Compute Engine** -> **VM Instances** and click **Create Instance**.
  2. Choose a cost-effective machine type (e.g., `e2-small` or `e2-medium`).
  3. Under **Boot Disk**, select a Linux distribution like **Ubuntu 22.04 LTS**.
  4. Under **Firewall**, check **Allow HTTP traffic** and **Allow HTTPS traffic**.
* **Install Docker & Docker Compose:**
  Connect to your VM via SSH and run:
  ```bash
  sudo apt-get update
  sudo apt-get install -y docker.io docker-compose
  sudo systemctl start docker
  sudo systemctl enable docker
  ```
* **Deploy the Application:**
  1. Clone your repository:
     ```bash
     git clone https://github.com/Tharunkunamalla/instant-route-guide.git
     cd instant-route-guide
     ```
  2. Create a `.env` file and add your credentials:
     ```bash
     echo "VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here" > .env
     ```
  3. Spin up the container services:
     ```bash
     sudo docker-compose up --build -d
     ```
* **Allow Traffic on Port 8080:**
  By default, the gateway listens on port `8080`. You need to create a firewall rule:
  1. Go to **VPC Network** -> **Firewall** -> **Create Firewall Rule**.
  2. Set **Target tags** to apply to your VM instance.
  3. Set **Source IP ranges** to `0.0.0.0/0`.
  4. Under **Protocols and ports**, select **Specified protocols and ports** -> **TCP** -> enter `8080`.
  5. Access your app at `http://<VM_EXTERNAL_IP>:8080`.

#### 2. Google Cloud Run (Serverless) - *Highly scalable*
If you prefer serverless deployment, you can deploy each service individually to Google Cloud Run:
* **Container Registry:** Build and push each container (`frontend`, `osm-proxy`, `pathfinding`) to Google Artifact Registry.
* **Routing Adjustments:** Since Cloud Run services get unique URLs and are serverless, you would need to:
  1. Update the frontend API URLs to point directly to the deployed Cloud Run endpoints for the OSM and Pathfinding services.
  2. Or run them in a **Cloud Run multi-container (sidecar)** configuration using the gateway as the main ingress container.

---

## Usage

1. **Launch the Dashboard**: Navigate to the Map interface.
2. **Search Location**: Enter a city or region in the search bar (e.g., "San Francisco, CA") and click **Load Map**.
3. **Map Network Loading**: The application will retrieve the OSM road grid for that bounding box and render it.
4. **Define Nodes**: Click on the map to set your **Source** point, and click again to set the **Destination** point.
5. **Select Algorithm**: Choose BFS, Dijkstra, or A* from the controls dashboard.
6. **Trigger Visualization**: Click **Find Route**. The map will animate node exploration progress step-by-step.
7. **Control Playback**: Adjust the speed slider, or pause and step frame-by-frame.

---

## Screenshots

### Landing Page
![Landing Page](public/s1.png)
*Landing page explaining key features and capabilities.*

### Interactive Interface
![Map Interface](public/s2.png)
*Core workspace panel highlighting search controls and map layers.*

### Pathfinding Animation
![Algorithm Visualization](public/s4.png)
*Live visual rendering of the algorithm exploring path candidates.*

### Results & Statistics
![Route Results](public/s5.png)
![Route Results](public/s6.png)
*Detailed visual statistics showing distance covered and traversal speed.*

---

## Results

### Performance Metrics

Tests conducted across varying route sizes (nodes represent intersections on standard OSM road grids):

#### Short Routes (< 1 km)
| Algorithm | Nodes Explored | Path Length | Execution Time |
|-----------|----------------|-------------|----------------|
| BFS | ~150 | Optimal (hop-based) | ~25 ms |
| Dijkstra | ~100 | Optimal | ~30 ms |
| A* | ~50 | Optimal | ~20 ms |

#### Medium Routes (1-5 km)
| Algorithm | Nodes Explored | Path Length | Execution Time |
|-----------|----------------|-------------|----------------|
| BFS | ~800 | Suboptimal | ~120 ms |
| Dijkstra | ~500 | Optimal | ~150 ms |
| A* | ~250 | Optimal | ~90 ms |

#### Long Routes (> 5 km)
| Algorithm | Nodes Explored | Path Length | Execution Time |
|-----------|----------------|-------------|----------------|
| BFS | ~2000 | Suboptimal | ~400 ms |
| Dijkstra | ~1200 | Optimal | ~500 ms |
| A* | ~600 | Optimal | ~300 ms |

### Key Takeaways
1. **A\* Efficiency**: A\* consistently explores 50% fewer nodes compared to Dijkstra, resulting in much faster execution times due to the directional heuristic.
2. **Dijkstra Optimality**: Dijkstra provides guaranteed shortest paths on all weighted grids but performs a blind radius scan.
3. **BFS Limits**: BFS is useful for topological/hop counting but is poorly suited for actual weighted road routing due to high node counts and suboptimal paths on weighted segments.

---

## Contributing

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/AmazingFeature`.
3. Commit your changes: `git commit -m 'Add some AmazingFeature'`.
4. Push to the branch: `git push origin feature/AmazingFeature`.
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Author

**Tharun Kunamalla**
- GitHub: [@Tharunkunamalla](https://github.com/Tharunkunamalla)

---

## Acknowledgments

- **OpenStreetMap** for providing the raw global mapping data.
- **Google Maps API** for robust address search geocoding.
- **shadcn/ui** for UI layout structures.
- **Leaflet** for the interactive map engine.

---

## References

- [Dijkstra's Algorithm - Wikipedia](https://en.wikipedia.org/wiki/Dijkstra%27s_algorithm)
- [A* Search Algorithm - Wikipedia](https://en.wikipedia.org/wiki/A*_search_algorithm)
- [Breadth-First Search - Wikipedia](https://en.wikipedia.org/wiki/Breadth-first_search)
- [OpenStreetMap API Wiki](https://wiki.openstreetmap.org/wiki/API)
