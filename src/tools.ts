// Tool catalog for the Allerion Genesis AI platform.
//
// Every tool here corresponds to a real function on window.TwinTools in the
// Allerion-Digital-Twin frontend (js/twin-tools.js). The LLM decides which
// tool to call; the frontend executes it against the Cesium viewer or
// fetches from a federal data source.
//
// Schemas follow the OpenAI / Workers AI tool-calling format so the same
// catalog works against either provider with minimal translation.

export type ToolDef = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: {
      type: "object";
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
};

export const TWIN_TOOLS: ToolDef[] = [
  {
    type: "function",
    function: {
      name: "fly_to",
      description:
        "Move the Cesium camera to a named site, a mine shaft, or arbitrary lon/lat coordinates on the Allerion property. Use this when the user asks to 'show me', 'go to', 'fly to', or 'zoom in on' a place.",
      parameters: {
        type: "object",
        properties: {
          target: {
            type: "string",
            description:
              "Named target. One of: 'overview', 'dubois', 'indiana', 'lavender', 'cores', 'hicksdome', 'regional', or 'custom' to use lon/lat.",
          },
          lon: { type: "number", description: "Longitude (only if target='custom')." },
          lat: { type: "number", description: "Latitude (only if target='custom')." },
          altitude_m: {
            type: "number",
            description: "Camera altitude in meters. Defaults to 1200.",
          },
        },
        required: ["target"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_layer",
      description:
        "Show or hide a thematic data layer on the digital twin (mines, cores, veins, HREE/LREE zones, property boundary, NURE geochemistry, etc.).",
      parameters: {
        type: "object",
        properties: {
          layer: {
            type: "string",
            description:
              "Layer key. One of: 'mines', 'cores', 'veins', 'interpolation', 'buildings', 'pointcloud', 'hree', 'lree', 'property', 'hicksdome', 'earthmri', 'tilesets', 'nure', 'bim'.",
          },
          visible: {
            type: "boolean",
            description: "true to show, false to hide. If omitted, toggles current state.",
          },
        },
        required: ["layer"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "drop_drill_target",
      description:
        "Place a proposed drill target pin on the map at lon/lat with a label and rationale. Used when proposing where to drill next based on geological reasoning.",
      parameters: {
        type: "object",
        properties: {
          lon: { type: "number" },
          lat: { type: "number" },
          label: { type: "string", description: "Short label, e.g. 'DT-1'." },
          rationale: {
            type: "string",
            description: "1-2 sentence justification grounded in the geological context.",
          },
          priority: {
            type: "string",
            description: "One of: 'high', 'medium', 'low'.",
          },
        },
        required: ["lon", "lat", "label"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "set_view_mode",
      description:
        "Switch the twin between 3D terrain, 2D top-down, satellite imagery toggle, or X-ray underground mode.",
      parameters: {
        type: "object",
        properties: {
          mode: {
            type: "string",
            description: "One of: '3d', '2d', 'satellite', 'xray', 'sunlight', 'orbit-lock', 'split-screen', 'drone'.",
          },
        },
        required: ["mode"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "load_bim_model",
      description:
        "Load an IFC (Industry Foundation Classes) BIM model into the twin via ThatOpen Components / web-ifc. The model is georeferenced and rendered as a Cesium overlay alongside the terrain. Use this when the user mentions BIM, IFC, a building model, or a facility/plant model URL.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "Public URL to an .ifc or .ifczip file.",
          },
          anchor_lon: {
            type: "number",
            description: "Longitude to anchor the model origin (defaults to property center).",
          },
          anchor_lat: { type: "number", description: "Latitude to anchor the model origin." },
          name: { type: "string", description: "Display name for the model." },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "query_usgs",
      description:
        "Query a USGS / federal data source by name (Earth MRI, NURE geochemistry, MRDS mineral resources). Returns a JSON summary the assistant can cite. Use for grounded geological claims rather than guessing.",
      parameters: {
        type: "object",
        properties: {
          source: {
            type: "string",
            description: "One of: 'earth_mri', 'nure', 'mrds', 'usgs_3dep'.",
          },
          bbox: {
            type: "array",
            description: "Optional bounding box [west, south, east, north] in WGS84 degrees.",
            items: { type: "number" },
          },
          element: {
            type: "string",
            description:
              "Optional chemistry filter: 'Ce', 'La', 'Nd', 'Y', 'Dy', 'Tb', 'F', etc.",
          },
        },
        required: ["source"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_bim_registry",
      description:
        "Search the curated registry of open-source BIM / digital-twin libraries that this platform can integrate (ThatOpen Components, Speckle, xeokit, IfcOpenShell, Eclipse Ditto, OpenUSD, iTwin.js, DTDL, etc.) for one that matches a capability (e.g. 'IFC parsing', 'point cloud streaming', 'data hub').",
      parameters: {
        type: "object",
        properties: {
          capability: {
            type: "string",
            description: "Free-text capability the user is looking for.",
          },
        },
        required: ["capability"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "annotate_feature",
      description:
        "Attach a text annotation/callout to an existing feature on the twin (a mine, a core hole, a vein). The annotation is rendered as a Cesium label and persisted in the chat session.",
      parameters: {
        type: "object",
        properties: {
          feature_id: {
            type: "string",
            description: "Feature id, e.g. 'dubois', 'indiana', 'lavender', or core 'C-1'..'C-4'.",
          },
          text: { type: "string", description: "Annotation text (max ~200 chars)." },
        },
        required: ["feature_id", "text"],
      },
    },
  },
];

// BIM / digital-twin open-source registry. Returned by search_bim_registry.
// Each entry intentionally short — the LLM can quote license/url, the user
// clicks through for depth.
export const BIM_REGISTRY: Array<{
  name: string;
  repo: string;
  license: string;
  language: string;
  category: string;
  description: string;
}> = [
  {
    name: "ThatOpen Components",
    repo: "https://github.com/ThatOpen/engine_components",
    license: "MIT",
    language: "TypeScript",
    category: "BIM viewer SDK",
    description:
      "Modern web BIM/IFC viewer SDK built on web-ifc + three.js. Successor to IFC.js. Drop-in toolkit for loading and exploring IFC in the browser.",
  },
  {
    name: "web-ifc",
    repo: "https://github.com/ThatOpen/engine_web-ifc",
    license: "MPL-2.0",
    language: "C++/WASM",
    category: "IFC parser",
    description:
      "Low-level WASM IFC parser. Powers ThatOpen Components and is callable directly when you need raw geometry/properties access.",
  },
  {
    name: "xeokit-sdk",
    repo: "https://github.com/xeokit/xeokit-sdk",
    license: "AGPL-3.0 (commercial available)",
    language: "JavaScript",
    category: "BIM/CAD viewer",
    description:
      "High-performance BIM/CAD viewer for IFC, glTF, CityJSON, LAS/LAZ. Strong for federated multi-discipline models.",
  },
  {
    name: "IfcOpenShell",
    repo: "https://github.com/IfcOpenShell/IfcOpenShell",
    license: "LGPL-3.0",
    language: "Python/C++",
    category: "BIM toolkit",
    description:
      "Reference open-source IFC toolkit. Used for server-side IFC conversion, validation, geometry extraction, and property querying.",
  },
  {
    name: "Bonsai (BlenderBIM)",
    repo: "https://github.com/IfcOpenShell/IfcOpenShell/tree/main/src/bonsai",
    license: "GPL-3.0",
    language: "Python (Blender add-on)",
    category: "BIM authoring",
    description:
      "Native IFC authoring inside Blender. Useful for producing/repairing IFC inputs that the twin then ingests.",
  },
  {
    name: "Speckle",
    repo: "https://github.com/specklesystems/speckle-server",
    license: "Apache-2.0",
    language: "TypeScript/Vue",
    category: "AEC data hub",
    description:
      "Open data hub for AEC: send geometry from Revit/Rhino/Grasshopper/IFC into a versioned stream that downstream apps (and LLMs) consume.",
  },
  {
    name: "buildingSMART bSDD",
    repo: "https://github.com/buildingSMART/bSDD",
    license: "MIT",
    language: "API/data",
    category: "BIM data dictionary",
    description:
      "Open buildingSMART Data Dictionary — canonical classifications/properties for IFC. Useful for normalizing terms across federated datasets.",
  },
  {
    name: "OpenUSD",
    repo: "https://github.com/PixarAnimationStudios/OpenUSD",
    license: "Apache-2.0 (Tomorrow license)",
    language: "C++/Python",
    category: "Scene description",
    description:
      "Pixar's Universal Scene Description. Increasingly used as a neutral interchange for AEC + industrial digital twins (NVIDIA Omniverse, AutoCAD).",
  },
  {
    name: "iTwin.js",
    repo: "https://github.com/iTwin/itwinjs-core",
    license: "MIT",
    language: "TypeScript",
    category: "Digital twin platform",
    description:
      "Bentley's open-source digital twin platform — federation across IFC/DGN/RVT, change tracking, web viewer. Heavy but enterprise-grade.",
  },
  {
    name: "Eclipse Ditto",
    repo: "https://github.com/eclipse-ditto/ditto",
    license: "EPL-2.0",
    language: "Java",
    category: "Digital twin runtime",
    description:
      "IoT-focused digital twin framework: device shadow, policy-based access, MQTT/HTTP/Kafka. Pairs well with telemetry-heavy twins.",
  },
  {
    name: "Azure Digital Twins (DTDL)",
    repo: "https://github.com/Azure/opendigitaltwins-dtdl",
    license: "MIT",
    language: "JSON-LD spec",
    category: "Modeling language",
    description:
      "Open spec for the Digital Twins Definition Language. Useful as a neutral schema even outside Azure (the Allerion repo already has DTDL samples).",
  },
  {
    name: "CesiumJS",
    repo: "https://github.com/CesiumGS/cesium",
    license: "Apache-2.0",
    language: "JavaScript",
    category: "Geospatial 3D",
    description:
      "The runtime the Allerion twin is built on. 3D Tiles, terrain, time-dynamic data. Mature pivot point for georeferenced BIM overlays.",
  },
  {
    name: "Resium",
    repo: "https://github.com/reearth/resium",
    license: "MIT",
    language: "TypeScript",
    category: "Cesium + React",
    description:
      "React bindings for CesiumJS. Useful if/when the Allerion twin moves to a component model.",
  },
  {
    name: "Open3D",
    repo: "https://github.com/isl-org/Open3D",
    license: "MIT",
    language: "C++/Python",
    category: "Point cloud / 3D scanning",
    description:
      "Point cloud processing, registration, mesh reconstruction. Useful for drone-survey post-processing before pushing into the twin.",
  },
  {
    name: "PDAL",
    repo: "https://github.com/PDAL/PDAL",
    license: "BSD",
    language: "C++",
    category: "Point cloud pipeline",
    description:
      "Point Data Abstraction Library — read/write/transform LAS/LAZ/COPC. Standard for LiDAR ingest into 3D Tiles.",
  },
  {
    name: "PostGIS",
    repo: "https://github.com/postgis/postgis",
    license: "GPL-2.0",
    language: "C/SQL",
    category: "Spatial database",
    description:
      "Spatial index/queries for the underlying parcel, claim, and sample data the twin pulls from.",
  },
  {
    name: "MapLibre GL JS",
    repo: "https://github.com/maplibre/maplibre-gl-js",
    license: "BSD-3-Clause",
    language: "TypeScript",
    category: "2D web mapping",
    description:
      "Open fork of Mapbox GL JS. Useful for the 2D inset / dual-sync view that the twin already exposes.",
  },
  {
    name: "Three.js",
    repo: "https://github.com/mrdoob/three.js",
    license: "MIT",
    language: "JavaScript",
    category: "WebGL 3D",
    description:
      "Underlying renderer used by ThatOpen Components and most web BIM viewers.",
  },
  {
    name: "FreeCAD",
    repo: "https://github.com/FreeCAD/FreeCAD",
    license: "LGPL-2.0",
    language: "C++/Python",
    category: "CAD",
    description:
      "Open-source CAD with native IFC import/export via IfcOpenShell. Useful upstream of the twin for facility design.",
  },
  {
    name: "Apache SeaTunnel",
    repo: "https://github.com/apache/seatunnel",
    license: "Apache-2.0",
    language: "Java/Scala",
    category: "Data ingestion",
    description:
      "Open data integration platform. Useful for moving sensor/USGS/NURE feeds into the twin's backing store.",
  },
];
