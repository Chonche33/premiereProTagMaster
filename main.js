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
  // Get the active project.
  const project = await ppro.Project.getActiveProject();
  if (!project) {
    log("There is no active project found", "red");
  } else {
    log(`Active project: ${project.name}`);
    // Get the active sequence.
    const sequence = await project.getActiveSequence();
    if (!sequence) {
      log("There is no active sequence found", "red");
    } else {
      log(`Active sequence: ${sequence.name}`);
    }
  }
}

// Function to get selected clips and set keywords metadata
async function addTagMasterMetadata() {
  try {
    console.log("=== TAG MASTER PLUGIN LOG ===");
    
    log("Getting selected clips...", "green");
    
    // Get the active project
    const project = await ppro.Project.getActiveProject();
    if (!project) {
      log("No active project found", "red");
      console.log("Error: No active project found");
      return;
    }
    log(`Active project: ${project.name}`);
    console.log(`Active project: ${project.name}`);

    // Get the active sequence
    const sequence = await project.getActiveSequence();
    if (!sequence) {
      log("No active sequence found", "red");
      console.log("Error: No active sequence found");
      return;
    }
    log(`Active sequence: ${sequence.name}`);
    console.log(`Active sequence: ${sequence.name}`);

    // Get the current selection from the sequence
    const selection = await sequence.getSelection();
    if (!selection || !selection.getTrackItems) {
      log("No selection found in the sequence. Please select a clip.", "red");
      console.log("Error: No selection found in the sequence");
      return;
    }
    
    // Get the selected track items (clips)
    const selectedTrackItems = await selection.getTrackItems();
    if (!selectedTrackItems || selectedTrackItems.length === 0) {
      log("No clips selected in the sequence. Please select a clip.", "red");
      console.log("Error: No clips selected in the sequence");
      return;
    }
    log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS ---`, "green");
    console.log(`\n--- LISTE DES CLIPS SÉLECTIONNÉS (${selectedTrackItems.length}) ---`);
    
    // Use a Map to filter by ID (only show each unique ID once)
    const uniqueClipsMap = new Map();
    
    for (const trackItem of selectedTrackItems) {
      const projectItem = await trackItem.getProjectItem();
      
      if (!projectItem) continue;
      
      // Get name
      let clipName = projectItem.name || trackItem.name || "Unnamed clip";
      
      // Get ID using getId() method
      let clipId;
      try {
        clipId = await projectItem.getId();
      } catch (idError) {
        clipId = projectItem.id || "Unknown ID";
      }
      
      // Only add if we haven't seen this ID before
      if (!uniqueClipsMap.has(clipId)) {
        uniqueClipsMap.set(clipId, {
          name: clipName,
          id: clipId,
          projectItem: projectItem,
          trackItem: trackItem
        });
      }
    }
    
    // Convert to array and display
    const uniqueClips = Array.from(uniqueClipsMap.values());
    
    for (let i = 0; i < uniqueClips.length; i++) {
      const clip = uniqueClips[i];
      const logMsg = `  ${i + 1}. ${clip.name} | ID: ${clip.id}`;
      log(logMsg, "blue");
      console.log(logMsg);
    }
    
    log(`\nTotal: ${uniqueClips.length} clip(s) unique(s) sélectionné(s)`);
    console.log(`\nTotal: ${uniqueClips.length} clip(s) unique(s) sélectionné(s)`);
    
    // Process ALL unique clips to set "toto" in "keywords" metadata
    if (uniqueClips.length > 0) {
      log(`\n--- Setting 'keywords' to 'toto' for all ${uniqueClips.length} clips ---`);
      console.log(`\n--- Setting 'keywords' to 'toto' for all ${uniqueClips.length} clips ---`);
      
      for (const clip of uniqueClips) {
        if (clip.projectItem) {
          try {
            log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
            console.log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
            
            // Get current XMP metadata (Dublin Core uses XMP)
            let currentXmpMetadata = {};
            try {
              const xmpMetadataStr = await ppro.Metadata.getXMPMetadata(clip.projectItem);
              console.log("Raw XMP metadata:", xmpMetadataStr);
              
              // XMP metadata is XML format, we need to parse it or work with it as string
              if (xmpMetadataStr && typeof xmpMetadataStr === 'string') {
                // Try to parse as XML to extract keywords
                // For now, we'll work with the string directly
                currentXmpMetadata = xmpMetadataStr;
              }
            } catch (xmpError) {
              log(`Could not get XMP metadata: ${xmpError.message}`, "orange");
              console.log(`Could not get XMP metadata: ${xmpError.message}`);
              currentXmpMetadata = {};
            }
            
            // For Dublin Core keywords, we need to use XMP metadata
            // The keywords are typically in dc:subject or xmp:Keywords
            // We'll try to set it using createSetXMPMetadataAction
            
            // Create XMP metadata with keywords
            const xmpMetadata = `<?xpacket begin="" id="W5M0MpCehiHzreSjNc9d"?>
<x:xmpmeta xmlns:x="adobe:ns:meta/">
  <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
    <rdf:Description rdf:about="" xmlns:dc="http://purl.org/dc/elements/1.1/">
      <dc:subject>
        <rdf:Bag>
          <rdf:li>toto</rdf:li>
        </rdf:Bag>
      </dc:subject>
    </rdf:Description>
  </rdf:RDF>
</x:xmpmeta>
<?xpacket end="w"?>`;
            
            log("Setting XMP keywords to 'toto'...");
            console.log("Setting XMP keywords to 'toto'...");
            
            // Create and execute the set XMP metadata action
            const setXmpMetadataAction = await ppro.Metadata.createSetXMPMetadataAction(
              clip.projectItem,
              xmpMetadata
            );
            
            if (!setXmpMetadataAction) {
              log("Failed to create XMP metadata action", "red");
              console.log("Error: Failed to create XMP metadata action");
              continue;
            }
            
            // Check if the action has an execute method or if it's auto-executed
            if (typeof setXmpMetadataAction.execute === 'function') {
              const success = await setXmpMetadataAction.execute();
              if (success) {
                log(`Successfully set keywords to 'toto' for ${clip.name}`, "green");
                console.log(`Successfully set keywords to 'toto' for ${clip.name}`);
              } else {
                log(`Failed to set keywords for ${clip.name}`, "red");
                console.log(`Failed to set keywords for ${clip.name}`);
              }
            } else if (typeof setXmpMetadataAction === 'boolean' && setXmpMetadataAction) {
              // Some actions return true directly
              log(`Successfully set keywords to 'toto' for ${clip.name}`, "green");
              console.log(`Successfully set keywords to 'toto' for ${clip.name}`);
            } else {
              // Try direct approach
              try {
                if (clip.projectItem.setXMPMetadata) {
                  await clip.projectItem.setXMPMetadata(xmpMetadata);
                  log(`Successfully set keywords to 'toto' for ${clip.name} (direct method)`, "green");
                  console.log(`Successfully set keywords to 'toto' for ${clip.name} (direct method)`);
                } else {
                  log(`No execute method and no direct method for ${clip.name}`, "red");
                  console.log(`No execute method and no direct method for ${clip.name}`);
                }
              } catch (directError) {
                log(`Direct method failed for ${clip.name}: ${directError.message}`, "red");
                console.log(`Direct method failed for ${clip.name}: ${directError.message}`);
              }
            }
            
            // Verify by getting XMP metadata again
            try {
              const updatedXmpMetadata = await ppro.Metadata.getXMPMetadata(clip.projectItem);
              console.log(`Updated XMP for ${clip.name}:`, updatedXmpMetadata);
              log(`Updated XMP metadata for ${clip.name}`, "green");
            } catch (verifyError) {
              log(`Could not verify XMP for ${clip.name}: ${verifyError.message}`, "orange");
              console.log(`Could not verify XMP for ${clip.name}: ${verifyError.message}`);
            }
            
          } catch (error) {
            log(`Error processing ${clip.name}: ${error.message}`, "red");
            console.log(`Error processing ${clip.name}: ${error.message}`);
            if (error.stack) {
              console.log(`Stack: ${error.stack}`);
            }
          }
        }
      }
    }
    
    console.log("\n=== END TAG MASTER PLUGIN LOG ===\n");
    log("\n✅ Process completed!");
    
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    console.log(`Error: ${error.message}`);
    if (error.stack) {
      log(`Stack: ${error.stack}`, "red");
      console.log(`Stack: ${error.stack}`);
    }
    console.error("Full error:", error);
  }
}

// Event listener for the Populate Application Info button.
document
  .querySelector("#btnPopulate")
  .addEventListener("click", populateProjectInfo);

// Event listener for the Add Tag Master Metadata button.
document
  .querySelector("#btnAddMetadata")
  .addEventListener("click", addTagMasterMetadata);

// Event listener for the Clear Application Info button.
document.querySelector("#clear-btn").addEventListener("click", () => {
  document.getElementById("plugin-body").innerHTML = "";
});

// Log function to display messages in the plugin body.
function log(msg, color) {
  const pluginBody = document.getElementById("plugin-body");
  pluginBody.innerHTML += color
    ? `<span style='color:${color}'>${msg}</span><br />`
    : `${msg}<br />`;
  // Auto-scroll to bottom
  pluginBody.scrollTop = pluginBody.scrollHeight;
}

function updateTheme(theme) {
  panelBody = document.getElementById("plugin-body");
  panelHeading = document.getElementById("plugin-heading"); 
  if(theme.includes("dark")) {
    panelBody.style.color = "#fff";
    panelHeading.style.color = "#fff";
  } else {
    panelBody.style.color = "#000";
    panelHeading.style.color = "#000";
  }
}

document.theme.onUpdated.addListener((theme) => {
	updateTheme(theme);
})

const currentTheme = document.theme.getCurrent();
updateTheme(currentTheme);
