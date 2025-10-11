# Retry file writing in smaller steps to avoid buffer error.
import json, os, textwrap

inpath = "/mnt/data/test.json.json"
with open(inpath, "r", encoding="utf-8") as f:
    gc = json.load(f)

node_type_map = {}
for nt in gc.get("nodeTypes", []):
    node_type_map[nt["id"]] = {"name": nt.get("name"), "color": nt.get("color") or "#888"}

edge_type_map = {}
for et in gc.get("edgeTypes", []):
    edge_type_map[et["id"]] = {"name": et.get("name"), "color": et.get("color") or "#bbb"}

elements = {"nodes": [], "edges": []}
for n in gc.get("nodes", []):
    nid = n.get("id")
    ntype = n.get("typeId")
    elements["nodes"].append({
        "data": {
            "id": nid,
            "label": n.get("name") or n.get("id"),
            "typeId": ntype,
            "type": node_type_map.get(ntype, {}).get("name")
        }
    })

for e in gc.get("edges", []):
    eid = e.get("id")
    sid = e.get("sourceId")
    tid = e.get("targetId")
    etype = e.get("typeId")
    elements["edges"].append({
        "data": {
            "id": eid,
            "source": sid,
            "target": tid,
            "typeId": etype,
            "type": edge_type_map.get(etype, {}).get("name")
        }
    })

out_json = {"elements": elements}
out_json_path = "/mnt/data/my-graph-cyto.json"
with open(out_json_path, "w", encoding="utf-8") as f:
    json.dump(out_json, f, indent=2)

# create html in smaller write
out_html_path = "/mnt/data/my-graph.html"
parts = []
parts.append("<!doctype html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n  <title>Interactive Network Viewer</title>\n  <style>\n    html, body { height:100%; margin:0; padding:0; }\n    #cy { width:100%; height:100vh; display:block; }\n    /* small control panel */\n    #controls { position: absolute; top: 10px; left: 10px; z-index: 999; background: rgba(255,255,255,0.9); padding:8px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.15); font-family: sans-serif; }\n    #controls button { margin:2px; }\n  </style>\n  <script src=\"https://unpkg.com/cytoscape/dist/cytoscape.min.js\"></script>\n</head>\n<body>\n  <div id=\"controls\" aria-hidden=\"false\">\n    <button id=\"fit\">Fit</button>\n    <button id=\"reset\">Reset View</button>\n    <button id=\"layout\">Re-run layout</button>\n    <span id=\"info\" style=\"margin-left:8px;font-size:12px;color:#333;\"></span>\n  </div>\n  <div id=\"cy\" role=\"application\" aria-label=\"Network graph\"></div>\n\n  <script>\n")

# inject mappings safely
parts.append("  const nodeTypeColors = {\n")
for k,v in node_type_map.items():
    # key: name, value: color
    if v["name"]:
        parts.append(f"    {json.dumps(v['name'])}: {json.dumps(v['color'])},\n")
parts.append("  };\n\n")

parts.append("  const edgeTypeColors = {\n")
for k,v in edge_type_map.items():
    if v["name"]:
        parts.append(f"    {json.dumps(v['name'])}: {json.dumps(v['color'])},\n")
parts.append("  };\n\n")

parts.append("""  // Safely fetch the JSON file (relative path)
  fetch('my-graph-cyto.json').then(r => r.json()).then(data => {
    const elements = data.elements || {};

    // Build Cytoscape style rules using the types/colors
    const style = [
      { selector: 'node', style: { 'label': 'data(label)', 'font-size': 12, 'text-valign': 'center', 'text-halign': 'center', 'color': '#222', 'text-outline-width': 0, 'width': 30, 'height': 30 } },
      { selector: 'edge', style: { 'width': 2, 'line-color': '#bbb', 'curve-style': 'bezier' } }
    ];

    // Add specific node color styles based on node type name
    Object.keys(nodeTypeColors).forEach(function(typeName) {
      style.push({
        selector: 'node[type = \"' + typeName + '\"]',
        style: { 'background-color': nodeTypeColors[typeName] }
      });
    });

    // Add specific edge color styles based on edge type name
    Object.keys(edgeTypeColors).forEach(function(typeName) {
      style.push({
        selector: 'edge[type = \"' + typeName + '\"]',
        style: { 'line-color': edgeTypeColors[typeName] }
      });
    });

    // Initialize cytoscape
    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: elements,
      style: style,
      layout: { name: 'cose', animate: true, gravity: 1, fit: true },
      wheelSensitivity: 0.2
    });

    // Make edges undirected (no arrows) - ensured by style not showing arrows
    // Interactions: show node info on click
    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      const info = 'Node: ' + node.data('label') + (node.data('type') ? ' (' + node.data('type') + ')' : '');
      document.getElementById('info').textContent = info;
    });

    cy.on('tap', function(e) {
      if( e.target === cy ) { document.getElementById('info').textContent = ''; }
    });

    document.getElementById('fit').addEventListener('click', function() { cy.fit(); });
    document.getElementById('reset').addEventListener('click', function() { cy.zoom(1); cy.center(); });
    document.getElementById('layout').addEventListener('click', function() { cy.layout({ name: 'cose', animate: true }).run(); });

  }).catch(err => { console.error('Failed loading graph JSON:', err); document.getElementById('info').textContent = 'Error loading graph data'; });
  </script>
</body>
</html>
""")

with open(out_html_path, "w", encoding="utf-8") as f:
    f.write("".join(parts))

{"json": out_json_path, "html": out_html_path}
