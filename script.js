let questions = [];
let currentQuestionIndex = 0;
let timer;
let allResponses = [];

fetch('questions/q_set1.txt')
    .then(response => response.text())
    .then(csvData => {
        questions = parseCSV(csvData);
        displayQuestion();
        updateProgressBar();
    })
    .catch(error => console.error('Error loading the CSV file:', error));

function parseCSV(csv) {
    const lines = csv.trim().split('\n');
    return lines.slice(1).map(line => {
        const [q, choicesStr, timeLimit, multipleChoice, randomizeOrder, type] = line.split('|');
        return {
            text: q,
            choices: choicesStr ? choicesStr.split(';') : [],
            timeLimit: parseInt(timeLimit) || 0,
            multipleChoice: multipleChoice.trim() === 'true',
            randomizeOrder: randomizeOrder.trim() === 'true',
            type: type.trim()
        };
    });
}

function displayQuestion() {
    const question = questions[currentQuestionIndex];
    document.getElementById('question').textContent = question.text;
    
    const choicesContainer = document.getElementById('choices');
    choicesContainer.innerHTML = '';
    
    if (question.type === 'choice') {
        let displayChoices = question.randomizeOrder ? shuffleArray([...question.choices]) : question.choices;
        
        displayChoices.forEach(choice => {
            const choiceElement = document.createElement('div');
            choiceElement.classList.add('choice');
            choiceElement.textContent = choice;
            choiceElement.onclick = () => toggleChoice(choiceElement, question.multipleChoice);
            choicesContainer.appendChild(choiceElement);
        });
    } else if (question.type === 'text') {
        const textInput = document.createElement('textarea');
        textInput.classList.add('text-input');
        textInput.placeholder = 'Type your answer here...';
        choicesContainer.appendChild(textInput);
    }

    document.getElementById('submit').onclick = submitAnswer;

    if (question.timeLimit > 0) {
        startTimer(question.timeLimit);
    } else {
        document.getElementById('timer').textContent = '';
    }

    updateQuestionNumber();
    updateProgressBar();
}

function toggleChoice(choiceElement, isMultipleChoice) {
    if (!isMultipleChoice) {
        document.querySelectorAll('.choice').forEach(el => el.classList.remove('selected'));
    }
    choiceElement.classList.toggle('selected');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function startTimer(seconds) {
    clearInterval(timer);
    let timeLeft = seconds;
    updateTimerDisplay(timeLeft);
    
    timer = setInterval(() => {
        timeLeft--;
        updateTimerDisplay(timeLeft);
        if (timeLeft <= 0) {
            clearInterval(timer);
            submitAnswer();
        }
    }, 1000);
}

function updateTimerDisplay(seconds) {
    document.getElementById('timer').textContent = seconds > 0 ? `Time left: ${seconds}s` : 'Time\'s up!';
}
function submitAnswer() {
    clearInterval(timer);
    let response;
    
    if (questions[currentQuestionIndex].type === 'choice') {
        const selected = document.querySelectorAll('.choice.selected');
        response = Array.from(selected).map(choice => choice.textContent).join(', ');
    } else if (questions[currentQuestionIndex].type === 'text') {
        response = document.querySelector('.text-input').value.trim();
    }
    
    console.log(`Question: ${questions[currentQuestionIndex].text}`);
    console.log(`Response: ${response}`);
    
    allResponses.push({
        question: questions[currentQuestionIndex].text,
        answer: response
    });
    
    nextQuestion();
}

function nextQuestion() {
    currentQuestionIndex++;
    if (currentQuestionIndex < questions.length) {
        displayQuestion();
    } else {
        finishSurvey();
    }
}

function updateProgressBar() {
    const progress = (currentQuestionIndex / questions.length) * 100;
    document.getElementById('progress').style.width = `${progress}%`;
}

function updateQuestionNumber() {
    document.getElementById('question-number').textContent = `${currentQuestionIndex + 1} / ${questions.length}`;
}


async function finishSurvey() {
    const surveyEndTime = new Date();
    const timeString = surveyEndTime.toLocaleString('en-GB', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit'
    }).replace(',', '');
    console.log('Exporting CSV started...1');

    document.getElementById('app').innerHTML = `
        <div id="header">
            <h1>Survey Completed</h1>
        </div>
        <div id="content">
            <p>Thank you for completing the Yamaha survey!</p>
            <p>Your responses have been recorded.</p>
        </div>
    `;
    console.log('Exporting CSV started...1');

    await exportToCSV(timeString);
}

async function exportToCSV(timeString) {
    const storageKey = 'yamaha_survey_results';
    const headers = ['time', 'index', ...questions.map(q => q.text)];
    let existingContent = localStorage.getItem(storageKey) || '';
    let newIndex = 1;

    if (existingContent) {
        const lines = existingContent.trim().split('\n');
        if (lines.length > 1) {
            const lastLine = lines[lines.length - 1].split(',');
            newIndex = parseInt(lastLine[1]) + 1 || 1;
        }
    }

    // Prepare the data row
    const dataRow = [timeString, newIndex, ...allResponses.map(r => r.answer)];

    let csvContent;
    if (existingContent) {
        csvContent = existingContent.trim() + '\n' + dataRow.join(',');
    } else {
        csvContent = headers.join(',') + '\n' + dataRow.join(',');
    }

    // Save to localStorage
    try {
        localStorage.setItem(storageKey, csvContent);
        console.log('Survey results saved successfully!');
        
        // Offer the CSV file for download
        downloadCSV(csvContent);
    } catch (error) {
        console.error('Error saving survey results:', error);
    }
}

function downloadCSV(csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "yamaha_survey_results.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}