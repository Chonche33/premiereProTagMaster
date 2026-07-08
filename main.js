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

// Global objects.
const ppro = require("premierepro");
const uxp = require("uxp");
const { XMPMeta } = uxp.xmp;

const PPRO_METADATA_URL = "http://ns.adobe.com/premierePrivateProjectMetaData/1.0/";
const DUBLIN_CORE_URL = "http://purl.org/dc/elements/1.1/";

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

// Function to get all metadata properties from a clip
async function getAllMetadataProperties(projectItem) {
  try {
    const metadata = await ppro.Metadata.getProjectMetadata(projectItem);
    if (!metadata) {
      return [];
    }
    
    const xmpProject = new XMPMeta(metadata);
    
    // Get all properties from both namespaces
    const pproProperties = xmpProject.getAllProperties(PPRO_METADATA_URL) || [];
    const dcProperties = xmpProject.getAllProperties(DUBLIN_CORE_URL) || [];
    
    // Combine properties
    const allProperties = [...pproProperties, ...dcProperties];
    
    // Extract property names
    const propertyNames = allProperties.map(prop => {
      let name = prop.path || prop.name || "";
      // Clean up the name by removing namespace
      name = name.replace(PPRO_METADATA_URL, "")
                 .replace(DUBLIN_CORE_URL, "dc:");
      return name;
    });
    
    return propertyNames;
  } catch (error) {
    console.log("Error getting metadata properties:", error.message);
    return [];
  }
}

// Function to find text-type metadata columns by checking actual property types
async function findTextMetadataColumns(project) {
  try {
    const projectRootItem = await project.getRootItem();
    const projectItems = await projectRootItem.getItems();
    
    if (projectItems.length === 0) {
      return [];
    }
    
    // Find first ClipProjectItem
    let firstClip = null;
    for (const item of projectItems) {
      if (ppro.ClipProjectItem.cast(item)) {
        firstClip = item;
        break;
      }
    }
    
    if (!firstClip) {
      return [];
    }
    
    // Get all metadata properties from the first clip
    const allProperties = await getAllMetadataProperties(firstClip);
    
    // Known text-type properties (from Premiere Pro metadata schema)
    const knownTextProperties = [
      "tag",
      "Tag",
      "Column.PropertyText.Tag",
      "keywords",
      "Keywords",
      "dc:subject",
      "Column.PropertyText.Label",
      "Column.PropertyText.Status",
      "Column.PropertyText.Comment",
      "Column.PropertyText.Description",
      "Column.PropertyText.Scene",
      "Column.PropertyText.Shot",
      "Column.PropertyText.Take",
      "Column.PropertyText.Note",
      "Column.PropertyText.Log",
      "Name",
      "Column.Intrinsic.Name"
    ];
    
    // Filter to only include known text properties that exist
    const textColumns = allProperties.filter(prop => 
      knownTextProperties.includes(prop)
    );
    
    // Also include any property that contains "PropertyText" or "Text"
    const additionalTextColumns = allProperties.filter(prop => 
      (prop.includes("PropertyText") || prop.includes("Text")) && 
      !textColumns.includes(prop)
    );
    
    return [...textColumns, ...additionalTextColumns];
    
  } catch (error) {
    console.log("Error finding text metadata columns:", error.message);
    return [];
  }
}

// Function to set 'toto' in the 'tag' field for all selected clips
async function addTagMasterMetadata() {
  try {
    console.log("=== TAG MASTER PLUGIN LOG ===");
    
    log("Getting project info...", "green");
    
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

    // Get text-type metadata columns
    log(`\n--- COLONNES DE METADONNEES DE TYPE TEXTE ---`, "green");
    console.log(`\n--- COLONNES DE METADONNEES DE TYPE TEXTE ---`);
    
    const textColumns = await findTextMetadataColumns(project);
    
    if (textColumns.length > 0) {
      // Display text-type column names
      for (let i = 0; i < textColumns.length; i++) {
        log(`  ${i + 1}. ${textColumns[i]}`, "blue");
        console.log(`  ${i + 1}. ${textColumns[i]}`);
      }
      log(`\nTotal: ${textColumns.length} colonnes de type texte`, "blue");
      console.log(`Total: ${textColumns.length} colonnes de type texte`);
    } else {
      log("Aucune colonne de type texte trouvee", "orange");
      console.log("Aucune colonne de type texte trouvee");
    }

    // Get selected clips
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
    
    log(`\nTotal: ${uniqueClips.length} clip(s) unique(s)`, "blue");
    console.log(`Total: ${uniqueClips.length} clip(s) unique(s)`);
    
    // Set 'toto' in the 'tag' field for ALL selected clips
    if (uniqueClips.length > 0) {
      log(`\n--- Setting 'tag' to 'toto' for all clips ---`, "green");
      console.log(`\n--- Setting 'tag' to 'toto' for all clips ---`);
      
      for (const clip of uniqueClips) {
        if (!clip.projectItem) continue;
        
        log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        console.log(`\nProcessing: ${clip.name} (ID: ${clip.id})`);
        
        try {
          // Get current metadata
          const currentMetadata = await ppro.Metadata.getProjectMetadata(clip.projectItem);
          console.log(`Current metadata for ${clip.name}:`, currentMetadata ? "exists" : "null");
          
          // Create XMPMeta object
          let xmpProject;
          if (currentMetadata) {
            xmpProject = new XMPMeta(currentMetadata);
          } else {
            xmpProject = new XMPMeta();
          }
          
          // Set the 'tag' property using the correct namespace
          console.log("Setting tag property...");
          xmpProject.setProperty(PPRO_METADATA_URL, "tag", "toto");
          
          // Also try Column.PropertyText.Tag
          xmpProject.setProperty(PPRO_METADATA_URL, "Column.PropertyText.Tag", "toto");
          
          // Serialize to string
          const newXmpStr = xmpProject.serialize();
          console.log("New XMP (first 500 chars):", newXmpStr.substring(0, 500));
          
          // Create and execute action
          const updatedFields = ["tag", "Column.PropertyText.Tag"];
          const action = await ppro.Metadata.createSetProjectMetadataAction(
            clip.projectItem,
            newXmpStr,
            updatedFields
          );
          
          console.log("Action created:", typeof action);
          
          // Execute the action
          if (action && typeof action.execute === 'function') {
            const success = await action.execute();
            console.log("Action executed:", success);
            if (success) {
              log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name}`, "green");
              console.log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name}`);
            } else {
              log(`❌ Action failed for ${clip.name}`, "red");
              console.log(`❌ Action failed for ${clip.name}`);
            }
          } else {
            // Action is auto-executed
            log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name} (auto-executed)`, "green");
            console.log(`✅ SUCCESS: 'tag' set to 'toto' for ${clip.name} (auto-executed)`);
          }
          
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
