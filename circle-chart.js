mutable selectedNode = null

chart2 = {

  // Function to handle text wrapping on the small circles
  function wrapText(sel, text, maxWidth, lineHeight = 1.2) {
    sel.selectAll("tspan").remove();

    if (!isFinite(maxWidth) || maxWidth < 14) {
      sel.append("tspan")
        .attr("x", 0)
        .attr("y", 0)
        .attr("dy", "0.35em")
        .text(text);
      return;
    }

    const words = text.split(/\s+/);
    const lines = [];
    let line = [];

    const temp = sel.append("tspan").attr("x", 0);

    for (let w of words) {
      line.push(w);
      temp.text(line.join(" "));
      if (temp.node().getComputedTextLength() > maxWidth) {
        line.pop();
        if (line.length > 0) {
          lines.push(line.join(" "));
        }
        line = [w];
        temp.text(line.join(" "));
      }
    }

    if (line.length > 0) {
      lines.push(line.join(" "));
    }
    temp.remove();

    const n = lines.length;
    const startY = -((n - 1) / 2) * lineHeight;

    lines.forEach((l, i) => {
      sel.append("tspan")
        .attr("x", 0)
        .attr("y", `${startY + lineHeight * i}em`)
        .attr("dy", "0.35em")
        .text(l);
    });
  }

  // Set container size based on device 
  const containerWidth = window.innerWidth || 928;
  let width, height;
  
  if (containerWidth < 600) {
    // Mobile
    width = Math.min(containerWidth - 32, 400);
    height = width * 0.8; // 4:5 aspect ratio for mobile
  } else if (containerWidth < 900) {
    // Tablet
    width = Math.min(containerWidth - 64, 600);
    height = width * 0.7; // roughly 10:7 aspect ratio
  } else {
    // Desktop
    width = Math.min(containerWidth * 0.6, 700);
    height = width * 0.7;
  }

  // Define a graph theme. Can easily plug other colors in here
  const THEMES = {

    default: {
      background: "#ffffff",
      labelLight: "#ffffff",
      labelDark: "#1a1a1a",

      // Light divider colors
       categories: {
        "Environment": ["#f4fff2", "#d6f2d3", "#a1e3a7"], // Green
        "Housing": ["#FFF8E3", "#fade96", "#ffd25e"], // Yellow
        "Immigration": ["#f0faff", "#cce7f5", "#84d4fc"], // light blue
        "Regional Organizing": ["#e4f2fc", "#73bdf1", "#34a2f0"], // blue bell
        "Youth": ["#FCEBE2", "#f5a176", "#e6743b"], // Orange
      }
    }
  
  };

// Pick active theme here:
const THEME = THEMES.default;

  // Compute the layout
  // NOTE: anytime the name of the data file changes,
  // you need to change the name in these three locations here!
  const pack = resourcesMarch2 => d3.pack()
      .size([width, height])
      .padding(3)
    (d3.hierarchy(resourcesMarch2)
      .sum(d => d.value || 1)
      .sort((a, b) => b.value - a.value));
  const root = pack(resourcesMarch2);

  const svg = d3.create("svg")
      .attr("viewBox", `0 0 ${width} ${height}`)
    // NOTE: This used to be height: 100% 
      .attr("style", `
        max-width: 100%;
        height: auto; 
        display: block;
        margin: 0 auto;
        background: hsl(0,0%,100%);
        cursor: pointer;
      `);

  // Import Raleway font
  svg.append("style").text(`
    @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600;700&display=swap');
    text {
      font-family: 'Raleway', sans-serif;
    }
  `);

  // Helper to get the top-level ancestor category name
  function getCategoryName(d) {
    let current = d;
    while (current.depth > 1) current = current.parent;
    return current.data.name;
  }

  // Append nodes
  const node = svg.append("g")
    .selectAll("circle")
    .data(root.descendants())
    .join("circle")
    .attr("fill", d => {
      if (d === root) return THEME.background;
    
      const category = getCategoryName(d);
      const colors = THEME.categories[category];
      if (!colors) return "#ccc";
      
      // Colors get lighter as you zoom into the circles
      if (d.depth === 1) return colors[2];
      if (d.depth === 2) return colors[1];
    
      return colors[0];
    })
    // Give black outline on hover
    .on("mouseover", function(event, d) {
      if (d !== root) d3.select(this).attr("stroke", "#000");
    })
    .on("mouseout", function(event, d) {
      if (d !== root) d3.select(this).attr("stroke", null);
    })
    .on("click", function(event, d) {
      event.stopPropagation();
      
      // If clicking on current focus, do nothing
      if (d === focus) {
        return;
      }
      
      // Check if this is a direct child of focus (zoom in)
      if (d.parent === focus) {
        if (!d.children) {
          // Leaf node: show the panel
          mutable selectedNode = d.data;
        } else {
          // Parent node: zoom in
          zoom(event, d);
          mutable selectedNode = null;
        }
        return;
      }
      
      // Check if this is the parent of focus (zoom out one level)
      if (d === focus.parent) {
        zoom(event, d);
        mutable selectedNode = null;
        return;
      }
      
      // Otherwise, don't do anything (clicking on non-adjacent nodes)
    });

  // Add the labels
  const label = svg.append("g")
  .attr("pointer-events", "none")
  .attr("text-anchor", "middle")
  .style("font-family", "Raleway, sans-serif")
  .style("font-size", "10px")
  .style("font-weight", 500)
  .selectAll("text")
  .data(root.descendants())
  .join("text")
    .style("display", d => d.parent === root ? "inline" : "none")
    .style("fill-opacity", d => d.parent === root ? 1 : 0)
    .style("fill", "#000");
    // .style("fill", d => {
    //   if (d === root) return THEME.labelDark;
    
    //   const category = getCategoryName(d);
    //   const colors = THEME.categories[category];
    //   if (!colors) return THEME.labelDark;
    
    //   let nodeColor;
    
    //   if (d.depth === 1) nodeColor = colors[0];
    //   else if (d.depth === 2) nodeColor = colors[1];
    //   else nodeColor = colors[2];
    
    //   return isDark(nodeColor)
    //     ? THEME.labelLight
    //     : THEME.labelDark;
    // })

  svg.on("click", event => {
    // Clicking background zooms to parent of current focus (one level up)
    if (focus.parent) {
      zoom(event, focus.parent);
      mutable selectedNode = null;
    }
  });

  let focus = root;
  let view;

  zoomTo([focus.x, focus.y, focus.r * 2]);
  
  // Function to update pointer-events based on current focus
  function updatePointerEvents() {
    node.attr("pointer-events", d => {
      if (d === root) return "none";
      // Only direct children and the parent are clickable
      if (d.parent === focus) return "all"; // children
      if (d === focus.parent) return "all"; // parent
      return "none"; // everything else
    });
  }
  
  // Set initial pointer-events after focus is defined
  updatePointerEvents();
  
  // Wrap labels after initial zoom using the view that was just set
  const k = Math.min(width, height) / view[2];
  label
    .filter(l => l.parent === root)
    .each(function(l) {
      const maxWidth = l.r * k * 1.6;
      wrapText(d3.select(this), l.data.name, maxWidth);
    });

  function zoomTo(v) {
    const k = Math.min(width, height) / v[2];
    view = v;
    label.attr("transform", d => `translate(${(d.x - v[0]) * k + width / 2},${(d.y - v[1]) * k + height / 2})`);
    node.attr("transform", d => `translate(${(d.x - v[0]) * k + width / 2}, ${(d.y - v[1]) * k + height / 2})`);
    node.attr("r", d => d.r * k);
  }

  function zoom(event, d) {
    const previousFocus = focus;
    focus = d;
  
    const transition = svg.transition()
      .duration(event.altKey ? 5000 : 800)
      .tween("zoom", () => {
        const i = d3.interpolateZoom(view, [focus.x, focus.y, focus.r * 2]);
        return t => zoomTo(i(t));
      });
  
    // Smooth fade out for old labels
    label
      .filter(l => l.parent === previousFocus)
      .transition(transition)
        .style("fill-opacity", 0)
        .on("end", function(l) {
          if (l.parent !== focus) d3.select(this).style("display", "none");
        });
    
    // Smooth fade in for new labels
    label
      .filter(l => l.parent === focus)
      .style("display", "inline")
      .style("fill-opacity", 0)
      .transition(transition)
        .style("fill-opacity", 1);
  
    // Update pointer-events and labels after zoom
    transition.on("end", () => {
      updatePointerEvents();
      updateLabelWrapping(focus);
    });
  }

  // Helper function to update label wrapping for current focus
  function updateLabelWrapping(focusNode) {
    // Use the current view to get the actual scale
    const k = Math.min(width, height) / view[2];
    const fx = view[0], fy = view[1];

    label
      .filter(l => l.parent === focusNode)
      .attr("transform", l =>
        `translate(${(l.x - fx) * k + width / 2}, ${(l.y - fy) * k + height / 2})`
      )
      .each(function(l) {
        const maxWidth = l.r * k * 1.6;
        wrapText(d3.select(this), l.data.name, maxWidth);
      });
  }

  return svg.node();
}

viewof detailsPanel = {
  // ensure this cell depends on selectedNode so it re-runs when selection changes
  selectedNode;
  const panel = html`<div></div>`;

  panel.appendChild(html`
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Raleway:wght@400;500;600&family=Cabin:wght@500;600;700&display=swap');
  
      /* Base panel font */
      .details-panel {
        font-family: 'Raleway', sans-serif;
      }
  
      /* Header font */
      .details-panel h3 {
        font-family: 'Cabin', sans-serif;
        font-weight: 600;
      }
    </style>
  `);

  // Create css class for applying fonts
  panel.classList.add("details-panel");
  
  // Base styling (inline so it applies inside iframe)
  Object.assign(panel.style, {
    width: "100%", // Takes full width of parent (panelHolder controls the actual width)
    height: "100%",
    flexShrink: "0",
    padding: "1rem",
    border: "1px solid #ccc",
    borderRadius: "6px",
    background: "white",
    wordWrap: "break-word",
    fontFamily: "'Raleway', sans-serif",
    overflowY: "auto",
    maxHeight: "90vh",
    boxSizing: "border-box",
    // Simplified animation just opacity, let panelHolder handle positioning
    transition: "opacity 0.4s ease",
    opacity: selectedNode ? "1" : "0"
  });
  
  // Load content
  function render(node) {
    if (!node) {
      panel.innerHTML = `<div style="color:#666">Select a resource to see details.</div>`;
      return;
    }
    panel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:start; gap: .5rem;">
        <div style="flex:1; min-width:0;">
          <h3 style="margin:0 0 .25rem 0; font-size:1rem; word-wrap:break-word;">${node.name}</h3>
          <div style="color:#444; font-size:0.9rem;">
            ${node.location ? `<div><strong>Location:</strong> ${node.location}</div>` : ""}
            ${node.category ? `<div><strong>Category:</strong> ${node.category}</div>` : ""}
            ${node.description ? `<p style="margin:.5rem 0 .5rem 0;">${node.description}</p>` : ""}
            ${node.link ? `<a href=${node.link} target="_blank" style="margin:.5rem 0 0 0;">${node.link}</a>` : ""}
            ${node.category && node.link ? `<p style="margin:.75rem 0 0 0; font-size:0.85rem; color:#666;">To learn more about this organization, visit the <a href="${node.resourceLink}" style="color:#0066cc; text-decoration:underline;">${node.category}</a> page.</p>` : ""}

          </div>
        </div>
        <button id="close-panel" style="
          background:none;border:none;font-size:18px;cursor:pointer;padding:0 0.25rem;color:#444;flex-shrink:0;
        ">✕</button>
      </div>
    `;
    const close = panel.querySelector("#close-panel");
    if (close) close.onclick = () => { mutable selectedNode = null; };
  }
  
  // initial render
  render(selectedNode);
  
  return panel;
}

mutable chartWrapper = null

chartPanel = {
  selectedNode;
  
  const PANEL_WIDTH = 280;
  
  // Get or create the wrapper
  let wrapper = mutable chartWrapper;
  
  if (!wrapper) {
    // Create wrapper
    wrapper = html`<div id="chartpanel-wrapper" style="
      display: flex;
      flex-direction: row;
      align-items: flex-start;
      width: 100%;
      box-sizing: border-box;
      position: relative;
      overflow: hidden;
      transition: gap 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
    "></div>`;
    
    // Inject responsive CSS (iframe-safe)
    wrapper.appendChild(html`
      <style>
        @media (max-width: 900px) {
          #chartpanel-wrapper {
            flex-direction: column !important;
            align-items: stretch !important;
          }

          #chart-holder {
            width: 100%;
          }

          #panel-holder {
            width: 100% !important;
            margin-top: 0.75rem;
          }
        }
      </style>
    `);
    
    // Chart holder
    const chartHolder = html`<div id="chart-holder" style="
      flex: 1;
      min-width: 0;
      display: flex;
      justify-content: center;
      align-items: flex-start;
      transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
    "></div>`;
    
    chartHolder.append(chart2);
    
    // Panel holder
    const panelHolder = html`<div id="panel-holder" style="
      flex-shrink: 0;
      transition: all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
      overflow: hidden;
      width: 0px;
      opacity: 0;
    "></div>`;
    
    panelHolder.append(viewof detailsPanel);
    
    // Assemble
    wrapper.append(chartHolder, panelHolder);
    
    // Store references
    wrapper._chartHolder = chartHolder;
    wrapper._panelHolder = panelHolder;
    
    // Save
    mutable chartWrapper = wrapper;
  }
  
  // Get persistent refs
  const chartHolder = wrapper._chartHolder;
  const panelHolder = wrapper._panelHolder;

  // Update panel content
  panelHolder.innerHTML = '';
  panelHolder.append(viewof detailsPanel);

  // Use container width (better for iframe + WP)
  const isMobile = wrapper.clientWidth < 700;

  if (selectedNode) {
    wrapper.style.gap = "0.5rem";

    if (isMobile) {
      wrapper.style.flexDirection = "column";
      panelHolder.style.width = "100%";
    } else {
      wrapper.style.flexDirection = "row";
      panelHolder.style.width = `${PANEL_WIDTH}px`;
    }

    panelHolder.style.opacity = "1";

  } else {
    wrapper.style.gap = "0";
    panelHolder.style.width = "0px";
    panelHolder.style.opacity = "0";
  }
  
  return wrapper;
}