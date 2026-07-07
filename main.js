/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 * Copyright 2025 Adobe
 * All Rights Reserved.
 *
 * NOTICE: Adobe permits you to use, modify, and distribute this file in
 * accordance with the terms of the Adobe license agreement accompanying
 * it. If you have received this file from a source other than Adobe,
 * then your use, modification, or distribution of it requires the prior
 * written permission of Adobe.
 **************************************************************************/

// Global object.
const ppro = require("premierepro");

// Call the Premiere Pro API to populate Application Info area.
async function populateProjectInfo() {
  const project = await ppro.Project.getActiveProject();
  if (!project) {
    log("There is no active project found", "red");
  } else {
    log(`Active project: ${project.name}`);
    const sequence = await project.getActiveSequence();
    if (!sequence) {
      log("There is no active sequence found", "red");
    } else {
      log(`Active sequence: ${sequence.name}`);
    }
  }
}

// Function to set 'toto' in the 'tag' field for all selected clips
async function addTagMasterMetadata() {
  try {
    console.log("=== TAG MASTER PLUGIN LOG ===");
    
    log("Getting selected clips...", "green");
    
    const project = await ppro.Project.getActiveProject();
    if (!project) {
      const errorMsg = "No active project found";
      log(errorMsg, "red");
      console.log(errorMsg);
      return;
    }
    log(`Active project: ${project.name}`);
    console.log(`Active project: ${project.name}`);

    const sequence = await project.getActiveSequence();
    if (!sequence) {
      const errorMsg = "No active sequence found";
      log(errorMsg, "red");
      console.log(errorMsg);
      return;
    }
    log(`Active sequence: ${sequence.name}`);
    console.log(`Active sequence: ${sequence.name}`);

    // NEW: Try to get project metadata columns
    log(`\n--- PROJECT METADATA COLUMNS ---`, "green");
    console.log(`\n--- PROJECT METADATA COLUMNS ---`);
    
    try {
      // Method 1: Try getProjectColumnsMetadata
      let metadataColumns = [];
      try {
        metadataColumns = await ppro.Metadata.getProjectColumnsMetadata();
        console.log("getProjectColumnsMetadata result:", metadataColumns);
      } catch (e) {
        console.log("getProjectColumnsMetadata failed:", e.message);
      }
      
      if (metadataColumns && metadataColumns.length > 0) {
        for (let i = 0; i < metadataColumns.length; i++) {
          const col = metadataColumns[i];
          const colInfo = `  ${i + 1}. ${col.name} (${col.displayName || 'N/A'}) - Type: ${col.type || 'unknown'}`;
          log(colInfo, "blue");
          console.log(colInfo);
        }
        log(`Total: ${metadataColumns.length} columns (via getProjectColumnsMetadata)`, "blue");
      } else {
        // Method 2: Get metadata from first clip to see available fields
        log("Getting metadata from first clip to see available fields...", "blue");
        console.log("Getting metadata from first clip...");
        
        const sequences = await project.getSequences();
        if (sequences && sequences.length > 0) {
          const firstSeq = sequences[0];
          const firstSeqSelection = await firstSeq.getSelection();
          if (firstSeqSelection && firstSeqSelection.getTrackItems) {
            const firstSeqItems = await firstSeqSelection.getTrackItems();
            if (firstSeqItems && firstSeqItems.length > 0) {
              const firstItem = await firstSeqItems[0].getProjectItem();
              if (firstItem) {
                try {
                  const firstItemMetadata = await ppro.Metadata.getProjectMetadata(firstItem);
                  console.log("First item metadata:", firstItemMetadata);
                  
                  if (firstItemMetadata) {
                    if (typeof firstItemMetadata === 'string') {
                      // Try to parse as JSON
                      try {
                        const parsed = JSON.parse(firstItemMetadata);
                        log("Available metadata fields:", "blue");
                        for (const key in parsed) {
                          log(`  - ${key}: ${parsed[key]}`, "blue");
                          console.log(`  - ${key}: ${parsed[key]}`);
                        }
                      } catch (e) {
                        // Show raw string (first 500 chars)
                        log("Raw metadata (first 500 chars):", "blue");
                        log(firstItemMetadata.substring(0, 500), "blue");
                        console.log("Raw metadata:", firstItemMetadata.substring(0, 500));
                      }
                    } else if (typeof firstItemMetadata === 'object') {
                      log("Available metadata fields:", "blue");
                      for (const key in firstItemMetadata) {
                        log(`  - ${key}: ${firstItemMetadata[key]}`, "blue");
                        console.log(`  - ${key}: ${firstItemMetadata[key]}`);
                      }
                    }
                  }
                } catch (metaError) {
                  console.log("Could not get first item metadata:", metaError.message);
                }
              }
            }
          }
        }
        
        // Method 3: Try to get XMP metadata to see structure
        log("\nGetting XMP metadata structure...", "blue");
        console.log("\nGetting XMP metadata structure...");
        try {
          const sequences = await project.getSequences();
          if (sequences && sequences.length > 0) {
            const firstSeq = sequences[0];
            const firstSeqSelection = await firstSeq.getSelection();
            if (firstSeqSelection && firstSeqSelection.getTrackItems) {
              const firstSeqItems = await firstSeqSelection.getTrackItems();
              if (firstSeqItems && firstSeqItems.length > 0) {
                const firstItem = await firstSeqItems[0].getProjectItem();
                if (firstItem) {
                  const xmpMetadata = await ppro.Metadata.getXMPMetadata(firstItem);
                  if (xmpMetadata) {
                    console.log("XMP metadata structure (first 1000 chars):", xmpMetadata.substring(0, 1000));
                    
                    // Extract all field names from XMP
                    const fieldMatches = xmpMetadata.match(/<[^:>]+:[^>]+>/g);
                    if (fieldMatches) {
                      log("XMP metadata fields:", "blue");
                      const uniqueFields = [...new Set(fieldMatches)];
                      for (const field of uniqueFields) {
                        log(`  - ${field}`, "blue");
                        console.log(`  - ${field}`);
                      }
                      log(`Total: ${uniqueFields.length} XMP fields`, "blue");
                    }
                  }
                }
              }
            }
          }
        } catch (xmpError) {
          console.log("Could not get XMP metadata:", xmpError.message);
        }
      }
    } catch (colsError) {
      log(`Could not get metadata columns: ${colsError.message}`, "orange");
      console.log(`Could not get metadata columns: ${colsError.message}`);
    }

    const selection = await sequence.getSelection();
    if (!selection || !selection.getTrackItems) {
      const errorMsg = "No selection found in the sequence";
      log(errorMsg, "red");
      console.log(errorMsg);
      return;
    }
    
    const selectedTrackItems = await selection.getTrackItems();
    if (!selectedTrackItems || selectedTrackItems.length === 0) {
      const errorMsg = "No clips selected in the sequence";
      log(errorMsg, "red");
      console.log(errorMsg);
      return;
    }
    
    log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS ---`, "green");
    console.log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS (${selectedTrackItems.length}) ---`);
    
    // Filter by unique project item ID
    const uniqueClipsMap = new Map();
    
    for (const trackItem of selectedTrackItems) {
      const projectItem = await trackItem.getProjectItem();
      if (!projectItem) continue;
      
      const clipName = projectItem.name || trackItem.name || "Unnamed clip";
      let clipId;
      try {
        clipId = await projectItem.getId();
      } catch (idError) {
        clipId = projectItem.id || "Unknown ID";
      }
      
      if (!uniqueClipsMap.has(clipId)) {
        uniqueClipsMap.set(clipId, { name: clipName, id: clipId, projectItem });
      }
    }
    
    const uniqueClips = Array.from(uniqueClipsMap.values());
    
    for (let i = 0; i < uniqueClips.length; i++) {
      const clip = uniqueClips[i];
      const logMsg = `  ${i + 1}. ${clip.name} | ID: ${clip.id}`;
      log(logMsg, "blue");
      console.log(logMsg);
    }
    
    log(`\nTotal: ${uniqueClips.length} clip(s) unique(s)`);
    console.log(`Total: ${uniqueClips.length} clip(s) unique(s)`);
    
    // Set 'toto' in the 'tag' field for ALL selected clips
    if (uniqueClips.length > 0) {
      log(`\n--- Setting 'tag' to 'toto' for all clips ---`, "green");
      console.log(`\n--- Setting 'tag' to 'toto' for all clips ---`);
      
      // Create XMP with tag set to 'toto'
      const tagXmp = `<?xpacket begin="" id="W5M0MpCehiHzreSjNc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:premierePrivateProjectMetaData="http://ns.adobe.com/premierePrivateProjectMetaData/1.0/">
      <premierePrivateProjectMetaData:tag>toto</premierePrivateProjectMetaData:tag>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
      
      for (const clip of uniqueClips) {
        if (!clip.projectItem) continue;
        
        log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        console.log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        
        try {
          // Use createSetXMPMetadataAction (this worked in your logs)
          console.log("Creating XMP metadata action...");
          const action = await ppro.Metadata.createSetXMPMetadataAction(
            clip.projectItem,
            tagXmp
          );
          
          console.log("Action created:", typeof action);
          
          log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name}`, "green");
          console.log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name}`);
          
        } catch (error) {
          log(`❌ FAILED: ${clip.name} - ${error.message}`, "red");
          console.log(`❌ FAILED: ${clip.name} - ${error.message}`);
          if (error.stack) console.log(`Stack: ${error.stack}`);
        }
      }
      
      log(`\n✅ ALL DONE! Check 'tag' column in Project Metadata panel for all ${uniqueClips.length} clips!`, "green");
      console.log(`\n✅ ALL DONE! Check 'tag' column in Project Metadata panel for all ${uniqueClips.length} clips!`);
    }
    
    console.log("\n=== END TAG MASTER PLUGIN LOG ===\n");
    
  } catch (error) {
    const errorMsg = `❌ ERROR: ${error.message}`;
    log(errorMsg, "red");
    console.log(errorMsg);
    if (error.stack) {
      log(`Stack: ${error.stack}`, "red");
      console.log(`Stack: ${error.stack}`);
    }
    console.error("Full error:", error);
  }
}

// Event listeners
document.querySelector("#btnPopulate").addEventListener("click", populateProjectInfo);
document.querySelector("#btnAddMetadata").addEventListener("click", addTagMasterMetadata);
document.querySelector("#clear-btn").addEventListener("click", () => {
  document.getElementById("plugin-body").innerHTML = "";
});

function log(msg, color) {
  const pluginBody = document.getElementById("plugin-body");
  pluginBody.innerHTML += color ? `<span style='color:${color}'>${msg}</span><br />` : `${msg}<br />`;
  pluginBody.scrollTop = pluginBody.scrollHeight;
}

function updateTheme(theme) {
  const panelBody = document.getElementById("plugin-body");
  const panelHeading = document.getElementById("plugin-heading");
  if (theme.includes("dark")) {
    panelBody.style.color = "#fff";
    panelHeading.style.color = "#fff";
  } else {
    panelBody.style.color = "#000";
    panelHeading.style.color = "#000";
  }
}

document.theme.onUpdated.addListener((theme) => { updateTheme(theme); });
const currentTheme = document.theme.getCurrent();
updateTheme(currentTheme);
