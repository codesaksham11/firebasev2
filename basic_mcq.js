// File: basic_mcq.js
// Import from the basic question bank
import { questionBank } from './basic_questions.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements (mostly same as see_mcq.js) ---
    const quizForm = document.getElementById('quiz-form');
    const questionsArea = document.getElementById('questions-area');
    const timerDisplaySpan = document.querySelector('#timer span');
    const loadingState = document.getElementById('loading-state');
    const submitButton = document.getElementById('submit-quiz-button');
    const backButton = document.getElementById('back-button');
    const confirmationModal = document.getElementById('confirmation-modal');
    const confirmBackButton = document.getElementById('confirm-back-button');
    const cancelBackButton = document.getElementById('cancel-back-button');

    // --- State Variables ---
    let quizConfig = null;
    let questionsToDisplay = [];
    let timerInterval = null;
    let timeLeft = 0;
    let startTime = null;
    let userAnswers = {};

    // ** UPDATED ** Subject priority for Basic level
    const SUBJECT_PRIORITY = ["English", "Physics", "Chemistry", "Biology"];
    // ** UPDATED ** LocalStorage key
    const LOCAL_STORAGE_KEY_CONFIG = 'basicQuizConfig';
    const LOCAL_STORAGE_KEY_RESULTS = 'basicQuizResults';
     // ** UPDATED ** Redirect Target
    const SETUP_PAGE_URL = 'basic_setup.html';
    const RESULT_PAGE_URL = 'basic_result.html';


    // --- Initialization ---
    function initQuiz() {
        startTime = Date.now();
        // 1. Load Config using the correct key
        const configString = localStorage.getItem(LOCAL_STORAGE_KEY_CONFIG);
        if (!configString) {
            handleError(`Quiz configuration not found. Please <a href="${SETUP_PAGE_URL}">set up the quiz</a> first.`);
            return;
        }
        quizConfig = JSON.parse(configString);

        // 2. Validate Config
        if (!quizConfig.numQuestions || !quizConfig.timeLimit || !quizConfig.selectedSubjects || quizConfig.selectedSubjects.length === 0) {
            handleError(`Invalid quiz configuration. Please <a href="${SETUP_PAGE_URL}">set up the quiz</a> again.`);
            return;
        }

        // 3. Prepare Questions (using the updated priority)
        questionsToDisplay = selectQuestions();
        if (!questionsToDisplay || questionsToDisplay.length === 0) {
             handleError(`Could not load questions based on your settings. Please <a href="${SETUP_PAGE_URL}">try again</a>.`);
             return;
        }

        // 4. Render Questions
        renderQuestions();

        // 5. Start Timer
        timeLeft = quizConfig.timeLimit * 60;
        startTimer();

        // 6. Show Form, Hide Loading
        loadingState.classList.add('hidden');
        quizForm.classList.remove('hidden');
    }

    // --- Question Selection & Distribution ---
    function selectQuestions() {
        const { numQuestions, selectedSubjects } = quizConfig; // selectedSubjects is fixed ["Physics", ...]
        let availableQuestions = {};
        let totalAvailableCount = 0;

        selectedSubjects.forEach(subject => {
            if (questionBank[subject]) {
                availableQuestions[subject] = [...questionBank[subject]];
                totalAvailableCount += availableQuestions[subject].length;
            } else {
                 console.warn(`Warning: Subject "${subject}" configured but not found in basic_questions.js`);
            }
        });

        // Ensure there are subjects to select from
        const actualSubjectsAvailable = Object.keys(availableQuestions);
        if (actualSubjectsAvailable.length === 0) {
            console.error("Error: No questions found for any of the configured subjects in basic_questions.js");
            return [];
        }


        let numToSelect = numQuestions;
        if (totalAvailableCount < numQuestions) {
            console.warn(`Warning: Not enough questions available (${totalAvailableCount}) for the required subjects to meet the requested number (${numQuestions}). Using all available.`);
            numToSelect = totalAvailableCount;
            quizConfig.numQuestions = totalAvailableCount; // Update config to reflect actual number
        }


        let finalQuestions = [];
        let questionsPerSubject = Math.floor(numToSelect / actualSubjectsAvailable.length);
        let remainder = numToSelect % actualSubjectsAvailable.length;

        // Sort available subjects based on the NEW priority order
        const sortedSelectedSubjects = actualSubjectsAvailable.sort((a, b) => {
            return SUBJECT_PRIORITY.indexOf(a) - SUBJECT_PRIORITY.indexOf(b);
        });

        sortedSelectedSubjects.forEach(subject => {
            let countForThisSubject = questionsPerSubject;
            // Only add remainder if there is one AND the subject pool has questions
            if (remainder > 0 && availableQuestions[subject].length > 0) {
                countForThisSubject++;
                remainder--;
            }
            // Ensure we don't try to pick more than available
            countForThisSubject = Math.min(countForThisSubject, availableQuestions[subject].length);

            const subjectPool = availableQuestions[subject];
            shuffleArray(subjectPool);
            const pickedQuestions = subjectPool.slice(0, countForThisSubject);

            pickedQuestions.forEach(q => q.subject = subject);
            finalQuestions.push(...pickedQuestions);

            pickedQuestions.forEach(q => { userAnswers[q.id] = null; });
        });

        // Final check - if due to rounding/availability we don't have numToSelect, log it.
        if (finalQuestions.length !== numToSelect) {
             console.warn(`Warning: Final question count (${finalQuestions.length}) differs from target (${numToSelect}) due to availability/distribution.`);
              quizConfig.numQuestions = finalQuestions.length; // Update again if needed
        }


        // Re-sort by the defined priority for display
        finalQuestions.sort((a, b) => {
             return SUBJECT_PRIORITY.indexOf(a.subject) - SUBJECT_PRIORITY.indexOf(b.subject);
        });

        return finalQuestions;
    }

    // Fisher-Yates Shuffle (same as before)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Rendering Questions (Structure is the same as see_mcq.js) ---
     function renderQuestions() {
        questionsArea.innerHTML = '';
        let currentSubject = null;
        let subjectGroupDiv = null;
        let questionCounter = 0;

        questionsToDisplay.forEach(q => {
            questionCounter++;
            if (q.subject !== currentSubject) {
                currentSubject = q.subject;
                subjectGroupDiv = document.createElement('div');
                subjectGroupDiv.className = 'subject-group';
                subjectGroupDiv.innerHTML = `<h2>${currentSubject}</h2>`;
                questionsArea.appendChild(subjectGroupDiv);
            }

            const questionCard = document.createElement('div');
            questionCard.className = 'question-card';
            questionCard.id = `q-${q.id}`;

            const questionTextP = document.createElement('p');
            questionTextP.className = 'question-text';
            questionTextP.innerHTML = `<strong>${questionCounter}.</strong> ${q.questionText}`;
            questionCard.appendChild(questionTextP);

            const optionsDiv = document.createElement('div');
            optionsDiv.className = 'options-group';
            optionsDiv.dataset.questionId = q.id;

            q.options.forEach(opt => {
                const label = document.createElement('label');
                const radioInput = document.createElement('input');
                radioInput.type = 'radio';
                radioInput.name = q.id;
                radioInput.value = opt.id;
                radioInput.addEventListener('change', handleAnswerChange);

                const span = document.createElement('span');
                span.textContent = ` ${opt.text}`;

                label.appendChild(radioInput);
                label.appendChild(span);
                optionsDiv.appendChild(label);
            });

            questionCard.appendChild(optionsDiv);
            // Append card to the *currently active* subjectGroupDiv
             if (subjectGroupDiv) {
                 subjectGroupDiv.appendChild(questionCard);
             } else {
                 // Fallback if something went wrong (shouldn't happen with current logic)
                 questionsArea.appendChild(questionCard);
                 console.error("Error: Could not find subject group div for question:", q);
             }
        });
    }


    // --- Timer Logic (same as see_mcq.js) ---
    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) { submitQuiz(true); }
            if(timeLeft <= 60 && !timerDisplaySpan.parentElement.classList.contains('warning')) {
                 timerDisplaySpan.parentElement.classList.add('warning');
             }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerDisplaySpan.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // --- Answer Handling (same as see_mcq.js) ---
    function handleAnswerChange(event) {
        userAnswers[event.target.name] = event.target.value;
    }

    // --- Back Button Logic ---
    backButton.addEventListener('click', () => {
        confirmationModal.style.display = 'flex';
    });

    confirmBackButton.addEventListener('click', () => {
        stopTimer();
        clearLocalStorage();
        window.location.href = SETUP_PAGE_URL; // Use constant
    });

    cancelBackButton.addEventListener('click', () => {
        confirmationModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == confirmationModal) {
            confirmationModal.style.display = 'none';
        }
    });

    // --- Submit Logic ---
    quizForm.addEventListener('submit', (event) => {
        event.preventDefault();
        submitQuiz(false);
    });

    function submitQuiz(isTimeOut = false) {
        stopTimer();
        submitButton.disabled = true;
        submitButton.textContent = 'Submitting...';

        const endTime = Date.now();
        const timeTaken = Math.round((endTime - startTime) / 1000);

        const quizResults = {
            questionsPresented: questionsToDisplay.map(q => ({
                id: q.id,
                questionText: q.questionText,
                options: q.options,
                correctOptionId: q.correctOptionId,
                subject: q.subject
            })),
            userAnswers: userAnswers,
            timeTaken: timeTaken,
            totalTimeAllowed: quizConfig.timeLimit * 60,
            wasTimeOut: isTimeOut,
            totalQuestions: quizConfig.numQuestions, // Use potentially updated count
            subjectsSelected: quizConfig.selectedSubjects // Store the fixed list used
        };

        // Store results using the correct key
        localStorage.setItem(LOCAL_STORAGE_KEY_RESULTS, JSON.stringify(quizResults));

        // Redirect to the correct results page
        window.location.href = RESULT_PAGE_URL;
    }

    // --- Utility Functions ---
    function handleError(messageHtml) { // Accept HTML for links
        console.error(messageHtml.replace(/<[^>]*>/g, '')); // Log plain text version
        questionsArea.innerHTML = `<p class="error-message">${messageHtml}</p>`;
        loadingState.classList.add('hidden');
        quizForm.classList.add('hidden');
        stopTimer();
    }

    function clearLocalStorage() {
         localStorage.removeItem(LOCAL_STORAGE_KEY_CONFIG);
    }

    // --- Start the Quiz ---
    initQuiz();
});
