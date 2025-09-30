// Titanic Dataset EDA - Client-side JavaScript
// Dataset schema - To use with other datasets, modify these arrays accordingly
const NUMERIC_FEATURES = ['Age', 'Fare', 'SibSp', 'Parch'];
const CATEGORICAL_FEATURES = ['Pclass', 'Sex', 'Embarked'];
const TARGET_VARIABLE = 'Survived'; // Only available in train data
const IDENTIFIER = 'PassengerId'; // Exclude from analysis

let mergedData = []; // Store the merged dataset

// Helper function to show status messages in the UI
function displayStatus(content, targetId = 'overviewContent') {
    const target = document.getElementById(targetId);
    if (target) {
        target.innerHTML = content;
        // Scroll to the content for better UX
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
        console.error(`Target element not found: ${targetId}`);
    }
}

// Helper to safely convert string to number or return null if invalid
function safeToNum(str) {
    if (str === null || str === undefined || String(str).trim() === '') {
        return null;
    }
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
}

// --- CORE FUNCTION: Promisified CSV Parsing ---
// Wraps PapaParse in a Promise to use async/await
function parseCSV(file, source) {
    return new Promise((resolve, reject) => {
        if (!file) {
            return reject(`No ${source} file provided.`);
        }
        
        Papa.parse(file, {
            header: true,
            dynamicTyping: false, // Handle typing manually after parsing
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length) {
                    // Check for parsing errors
                    console.error(`PapaParse errors for ${source} data:`, results.errors);
                    reject(`Error parsing ${source} data: ${results.errors[0].message}`);
                    return;
                }

                // Add source and clean data types
                const cleanData = results.data.map(row => {
                    // Add a source tag
                    row.source = source; 
                    
                    // Convert numeric features
                    NUMERIC_FEATURES.forEach(feature => {
                        if (row[feature] !== undefined) {
                            row[feature] = safeToNum(row[feature]);
                        }
                    });
                    
                    // Convert PassengerId (Identifier) and Survived (Target)
                    if (row[IDENTIFIER] !== undefined) {
                         row[IDENTIFIER] = safeToNum(row[IDENTIFIER]);
                    }
                    if (row[TARGET_VARIABLE] !== undefined && source === 'train') {
                        // Survived is only in the train set and should be an integer (0 or 1)
                        row[TARGET_VARIABLE] = safeToNum(row[TARGET_VARIABLE]);
                    }
                    // Pclass is a categorical feature but often stored as number
                    if (row['Pclass'] !== undefined) {
                         row['Pclass'] = String(row['Pclass']);
                    }

                    return row;
                });
                
                resolve(cleanData);
            },
            error: (err) => {
                reject(`Error reading ${source} file: ${err.message}`);
            }
        });
    });
}

// --- CORE FUNCTION: Load and merge train and test data ---
async function loadAndMergeData() {
    displayStatus('Loading and parsing data... Please wait.', 'overviewContent');
    mergedData = []; // Clear previous data
    
    const trainFile = document.getElementById('trainFile').files[0];
    const testFile = document.getElementById('testFile').files[0];

    if (!trainFile || !testFile) {
        displayStatus('<p style="color: #e74c3c;"><strong>Error:</strong> Please select both the Training and Testing CSV files.</p>', 'overviewContent');
        return;
    }

    try {
        // Wait for both files to be parsed simultaneously
        const [trainData, testData] = await Promise.all([
            parseCSV(trainFile, 'train'),
            parseCSV(testFile, 'test')
        ]);
        
        // Merge the datasets
        mergedData = [...trainData, ...testData];
        
        // Final check and UI update
        if (mergedData.length > 0) {
            displayStatus(`
                <p style="color: #2ecc71;"><strong>&#x2714; Data loaded successfully!</strong></p>
                <p>Total Records: <strong>${mergedData.length}</strong></p>
                <p>Training Records: <strong>${trainData.length}</strong></p>
                <p>Testing Records: <strong>${testData.length}</strong></p>
                <p>You can now proceed with the analysis steps below.</p>
            `, 'overviewContent');
        } else {
            displayStatus('<p style="color: #e74c3c;"><strong>Error:</strong> Data loading failed. Merged dataset is empty.</p>', 'overviewContent');
        }
    } catch (error) {
        displayStatus(`<p style="color: #e74c3c;"><strong>Critical Error during data loading:</strong> ${error}</p>`, 'overviewContent');
        console.error('Critical Error during data loading:', error);
    }
}


// --- Utility to check if data is loaded ---
function checkDataLoaded(targetId = 'overviewContent') {
    if (mergedData.length === 0) {
        displayStatus('<p style="color: #e74c3c;"><strong>Error:</strong> Please load and merge the data first (Section 1).</p>', targetId);
        return false;
    }
    return true;
}

// --- ANALYSIS FUNCTIONS ---

// 3. Show Data Overview
function showDataOverview() {
    if (!checkDataLoaded('overviewContent')) return;

    const dataLength = mergedData.length;
    const columns = Object.keys(mergedData[0] || {});
    
    // Display basic structure
    let html = '<h3>Dataset Structure</h3>';
    html += `<p>Total Rows: <strong>${dataLength}</strong></p>`;
    html += `<p>Total Columns: <strong>${columns.length}</strong> (Ex: ${columns.slice(0, 5).join(', ')}...)</p>`;
    html += `<p>Training Records (with '${TARGET_VARIABLE}'): <strong>${mergedData.filter(d => d.source === 'train').length}</strong></p>`;
    html += `<p>Testing Records (without '${TARGET_VARIABLE}'): <strong>${mergedData.filter(d => d.source === 'test').length}</strong></p>`;

    // Display first 5 rows
    html += '<h3>First 5 Rows (Head)</h3>';
    if (dataLength > 0) {
        html += '<div style="overflow-x: auto;"><table style="width:100%; min-width: 800px; border-collapse: collapse;">';
        // Header row
        html += '<thead><tr style="background-color: #3498db; color: white;">' + columns.map(col => `<th style="border: 1px solid #ddd; padding: 10px; text-align: left;">${col}</th>`).join('') + '</tr></thead>';
        // Data rows
        html += '<tbody>';
        for (let i = 0; i < Math.min(5, dataLength); i++) {
            const rowColor = i % 2 === 0 ? '#ecf0f1' : 'white';
            html += `<tr style="background-color: ${rowColor}">` + columns.map(col => `<td style="border: 1px solid #ddd; padding: 8px; font-size: 0.9em;">${mergedData[i][col] === null ? '<span style="color: #e74c3c; font-weight: bold;">NULL</span>' : mergedData[i][col]}</td>`).join('') + '</tr>';
        }
        html += '</tbody></table></div>';
    } else {
         html += '<p>No data records to display.</p>';
    }

    displayStatus(html, 'overviewContent');
}

// 4. Missing Values Analysis
function analyzeMissingValues() {
    if (!checkDataLoaded('missingContent')) return;
    const dataLength = mergedData.length;
    
    if (dataLength === 0) {
        displayStatus('<p style="color: #e74c3c;">No data to analyze.</p>', 'missingContent');
        return;
    }

    const missingCounts = {};
    const columns = Object.keys(mergedData[0]);

    columns.forEach(col => {
        missingCounts[col] = 0;
    });

    mergedData.forEach(row => {
        columns.forEach(col => {
            // Check for null (from safeToNum) or empty string/undefined
            if (row[col] === null || row[col] === undefined || String(row[col]).trim() === '') {
                missingCounts[col] += 1;
            }
        });
    });

    let html = '<h3>Missing Value Counts Across Merged Dataset</h3>';
    html += '<table style="width:70%; max-width: 500px; border-collapse: collapse; margin-top: 10px; border-radius: 5px; overflow: hidden;">';
    html += '<thead><tr style="background-color: #34495e; color: white;">';
    html += '<th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Feature</th>';
    html += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Missing Count</th>';
    html += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Missing %</th>';
    html += '</tr></thead><tbody>';

    columns.forEach(col => {
        const count = missingCounts[col];
        const percent = ((count / dataLength) * 100).toFixed(2);
        const style = count > 0 ? 'background-color: #fcebeb;' : 'background-color: #e6f7ff;';
        
        html += `<tr style="${style}">`;
        html += `<td style="border: 1px solid #ddd; padding: 8px;">${col}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold; color: ${count > 0 ? '#c0392b' : '#27ae60'};">${count}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${percent}%</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';

    displayStatus(html, 'missingContent');
}

// 5. Statistical Summary (Mean, Min, Max for Numeric Features)
function generateStatisticalSummary() {
    if (!checkDataLoaded('statsContent')) return;
    
    const summary = {};
    
    NUMERIC_FEATURES.forEach(feature => {
        // Only consider the training data for reliable statistics if possible, but for EDA we use merged
        const values = mergedData
            .map(row => row[feature])
            .filter(val => val !== null && !isNaN(val)); // Filter out nulls and NaNs

        if (values.length > 0) {
            const sum = values.reduce((a, b) => a + b, 0);
            const mean = sum / values.length;
            const min = Math.min(...values);
            const max = Math.max(...values);
            
            summary[feature] = {
                count: values.length,
                mean: mean.toFixed(2),
                min: min.toFixed(2),
                max: max.toFixed(2)
            };
        } else {
             summary[feature] = { count: 0, mean: 'N/A', min: 'N/A', max: 'N/A' };
        }
    });

    let html = '<h3>Statistical Summary of Numeric Features (Merged Data)</h3>';
    html += '<table style="width:70%; max-width: 600px; border-collapse: collapse; margin-top: 10px; border-radius: 5px; overflow: hidden;">';
    html += '<thead><tr style="background-color: #3498db; color: white;">';
    html += '<th style="border: 1px solid #ddd; padding: 10px; text-align: left;">Feature</th>';
    html += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Count</th>';
    html += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Mean</th>';
    html += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Min</th>';
    html += '<th style="border: 1px solid #ddd; padding: 10px; text-align: center;">Max</th>';
    html += '</tr></thead><tbody>';

    NUMERIC_FEATURES.forEach(feature => {
        const stats = summary[feature];
        const rowColor = stats.count > 0 ? 'white' : '#fcebeb';
        html += `<tr style="background-color: ${rowColor};">`;
        html += `<td style="border: 1px solid #ddd; padding: 8px;">${feature}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.count}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.mean}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.min}</td>`;
        html += `<td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${stats.max}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table>';

    displayStatus(html, 'statsContent');
}

// 6. Data Visualizations (Example: Pclass distribution & Survival Rate)
function generateVisualizations() {
    if (!checkDataLoaded('vizContent')) return;

    const vizContent = document.getElementById('vizContent');
    vizContent.innerHTML = '<h3>Passenger Class Distribution</h3><canvas id="pclassChart" style="max-height: 400px;"></canvas>';

    const pclassCounts = {};
    const pclassColors = {
        '1': '#f1c40f', // Gold
        '2': '#3498db', // Blue
        '3': '#2ecc71'  // Green
    };

    // 1. Passenger Class Distribution (Merged Data)
    mergedData.forEach(row => {
        const pclass = String(row.Pclass);
        if (pclass && pclass !== 'null' && pclass !== 'undefined') {
            pclassCounts[pclass] = (pclassCounts[pclass] || 0) + 1;
        }
    });

    const pclassLabels = Object.keys(pclassCounts).sort((a, b) => parseInt(a) - parseInt(b));
    const pclassData = pclassLabels.map(label => pclassCounts[label]);
    const pclassBgColors = pclassLabels.map(label => pclassColors[label] || '#95a5a6');
    
    // Destroy previous chart if it exists
    const existingChart = Chart.getChart("pclassChart");
    if (existingChart) {
        existingChart.destroy();
    }

    const ctx = document.getElementById('pclassChart').getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: pclassLabels.map(l => `Class ${l}`),
            datasets: [{
                label: '# of Passengers',
                data: pclassData,
                backgroundColor: pclassBgColors,
                borderColor: pclassBgColors.map(c => c),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Count' }
                },
                x: {
                    title: { display: true, text: 'Passenger Class' }
                }
            },
            plugins: {
                title: { display: true, text: 'Passenger Class Distribution' }
            }
        }
    });

    // 2. Survival Rate (Training Data Only)
    const trainData = mergedData.filter(row => row.source === 'train' && row[TARGET_VARIABLE] !== null);
    
    if (trainData.length > 0) {
        vizContent.insertAdjacentHTML('beforeend', '<h3 style="margin-top: 30px;">Survival Rate</h3><canvas id="survivalChart" style="max-height: 400px; max-width: 400px; margin: 0 auto; display: block;"></canvas>');

        const survivedCount = trainData.filter(row => row[TARGET_VARIABLE] === 1).length;
        const perishedCount = trainData.filter(row => row[TARGET_VARIABLE] === 0).length;
        
        // Destroy previous chart if it exists
        const existingSurvivalChart = Chart.getChart("survivalChart");
        if (existingSurvivalChart) {
            existingSurvivalChart.destroy();
        }

        const survivalCtx = document.getElementById('survivalChart').getContext('2d');
        new Chart(survivalCtx, {
            type: 'doughnut',
            data: {
                labels: ['Perished (0)', 'Survived (1)'],
                datasets: [{
                    label: 'Survival Status',
                    data: [perishedCount, survivedCount],
                    backgroundColor: ['#e74c3c', '#27ae60'], // Red for perished, Green for survived
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: 'Survival Status (Training Data)' }
                }
            }
        });
    }

    displayStatus('', 'vizContent'); // Ensure vizContent is the scroll target
}

// 7. Export Merged CSV
function exportMergedCSV() {
    if (!checkDataLoaded('exportStatus')) return;

    try {
        // Use PapaParse to unparse the JSON data back to CSV format
        const csv = Papa.unparse(mergedData, {
            quotes: true,
            delimiter: ",",
            header: true
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'titanic_merged_data.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        displayStatus('<p style="color: #2ecc71;">&#x2714; Merged CSV exported successfully!</p>', 'exportStatus');
    } catch (error) {
        displayStatus('<p style="color: #e74c3c;"><strong>Error exporting CSV:</strong> ' + error.message + '</p>', 'exportStatus');
        console.error('Error exporting CSV:', error);
    }
}

// 8. Export JSON summary (Modified to use displayStatus instead of alert)
function exportJSONSummary() {
    if (!checkDataLoaded('exportStatus')) return;
    
    try {
        const trainData = mergedData.filter(row => row.source === 'train');
        const testData = mergedData.filter(row => row.source === 'test');
        
        // Create summary object
        const summary = {
            dataset: 'Titanic',
            recordCount: {
                total: mergedData.length,
                train: trainData.length,
                test: testData.length
            },
            columns: Object.keys(mergedData[0] || {}),
            numericFeatures: NUMERIC_FEATURES,
            categoricalFeatures: CATEGORICAL_FEATURES,
            generated: new Date().toISOString()
        };
        
        const json = JSON.stringify(summary, null, 2);
        const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
        const link = document.createElement('a');
        
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', 'titanic_data_summary.json');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        displayStatus('<p style="color: #2ecc71;">&#x2714; JSON summary exported successfully!</p>', 'exportStatus');
    } catch (error) {
        displayStatus('<p style="color: #e74c3c;"><strong>Error exporting JSON:</strong> ' + error.message + '</p>', 'exportStatus');
        console.error('Error exporting JSON:', error);
    }
}


// DOM elements (Ensuring the elements exist before adding listeners)
const loadDataBtn = document.getElementById('loadDataBtn');
const showOverviewBtn = document.getElementById('showOverviewBtn');
const showMissingBtn = document.getElementById('showMissingBtn');
const showStatsBtn = document.getElementById('showStatsBtn');
const showVizBtn = document.getElementById('showVizBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');

// Event listeners
if(loadDataBtn) loadDataBtn.addEventListener('click', loadAndMergeData);
if(showOverviewBtn) showOverviewBtn.addEventListener('click', showDataOverview);
if(showMissingBtn) showMissingBtn.addEventListener('click', analyzeMissingValues);
if(showStatsBtn) showStatsBtn.addEventListener('click', generateStatisticalSummary);
if(showVizBtn) showVizBtn.addEventListener('click', generateVisualizations);
if(exportCsvBtn) exportCsvBtn.addEventListener('click', exportMergedCSV);
if(exportJsonBtn) exportJsonBtn.addEventListener('click', exportJSONSummary);