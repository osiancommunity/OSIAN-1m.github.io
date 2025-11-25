document.addEventListener("DOMContentLoaded", function() {

    // --- Backend URL ---
    const backendUrl = 'http://localhost:5000/api';

    // --- Authentication ---
    const user = JSON.parse(localStorage.getItem('user'));
    const token = localStorage.getItem('token');

    // Security Check: Is user logged in?
    if (!token || !user) {
        alert("You must be logged in to take a quiz. Redirecting...");
        window.location.href = 'login.html';
        return;
    }

    // --- Get Quiz ID from URL ---
    const urlParams = new URLSearchParams(window.location.search);
    const quizId = urlParams.get('id');

    if (!quizId) {
        alert("Invalid quiz. No ID provided. Redirecting...");
        window.location.href = 'quiz-progress.html';
        return;
    }

    // --- Page Elements ---
    const warningModal = document.getElementById('warning-modal');
    const autoSubmitModal = document.getElementById('auto-submit-modal');
    const finalSubmitModal = document.getElementById('final-submit-modal');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const quizContainer = document.getElementById('quiz-container');
    const timeLeftDisplay = document.getElementById('time-left');
    const cheatingWarningBanner = document.getElementById('cheating-warning');
    const violationCountDisplay = document.getElementById('violation-count');
    const submitQuizBtn = document.getElementById('submit-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');

    // Disable start button immediately to prevent premature clicks
    startQuizBtn.disabled = true;
    startQuizBtn.textContent = 'Loading Quiz...';

    // --- Quiz Data ---
    let currentQuizData = null; // To store quiz questions
    let currentQuestionIndex = 0;
    let userAnswers = []; // To store user's answers
    let writtenAnswers = []; // To store written answers
    let timerInterval = null;
    let timer = 0; // Track remaining time
    let violationCount = 0;
    const maxViolations = 2;
    let isLoading = false; // To track loading state

    // ===================================
    // 1. LOAD QUIZ DATA
    // ===================================
    async function loadQuiz() {
        isLoading = true;
        startQuizBtn.disabled = true;
        startQuizBtn.textContent = 'Loading Quiz...';

        try {
            const response = await fetch(`${backendUrl}/quizzes/${quizId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return; // Silently redirect
                }
                const data = await response.json();
                throw new Error(data.message);
            }

            currentQuizData = await response.json();

            // Set up the quiz page
            document.querySelector('.quiz-info h3').textContent = currentQuizData.title;
            timeLeftDisplay.textContent = `${currentQuizData.duration}:00`;

            // Enable start button
            isLoading = false;
            startQuizBtn.disabled = false;
            startQuizBtn.textContent = 'I Understand, Start the Quiz';

        } catch (error) {
            console.error('Error loading quiz:', error);
            alert(`Error: ${error.message}. Redirecting...`);
            window.location.href = 'quiz-progress.html';
        }
    }
    
    // ===================================
    // 2. START QUIZ
    // ===================================
    startQuizBtn.addEventListener('click', function() {
        if (!currentQuizData) {
            alert('Quiz data not loaded. Please refresh the page.');
            return;
        }
        warningModal.classList.remove('active');
        quizContainer.style.display = 'block';
        startTimer(currentQuizData.duration * 60); // Start timer
        displayQuestion(0); // Show the first question
        addSecurityListeners(); // Activate anti-cheating
        updateNavigationButtons(); // Update navigation buttons
    });

    // ===================================
    // 3. DISPLAY & NAVIGATION
    // ===================================
    function displayQuestion(index) {
        if (!currentQuizData || index >= currentQuizData.questions.length) {
            return; // No more questions
        }

        currentQuestionIndex = index;
        const question = currentQuizData.questions[index];

        document.getElementById('question-number').textContent = `Question ${index + 1} of ${currentQuizData.questions.length}`;
        document.querySelector('.question-header h2').textContent = question.questionText;

        const optionsContainer = document.querySelector('.options-container');
        const writtenContainer = document.querySelector('.written-answer-container');
        const writtenTextarea = document.getElementById('written-answer');

        if (question.questionType === 'mcq') {
            optionsContainer.style.display = 'grid';
            writtenContainer.style.display = 'none';
            optionsContainer.innerHTML = ''; // Clear old options

            question.options.forEach((option, i) => {
                optionsContainer.innerHTML += `
                    <div class="option" data-option-index="${i}">
                        <span>${String.fromCharCode(65 + i)}</span> <p>${option.text}</p>
                    </div>
                `;
            });

            // Add click listeners to new options
            document.querySelectorAll('.option').forEach(opt => {
                opt.addEventListener('click', selectAnswer);
            });
        } else if (question.questionType === 'written') {
            optionsContainer.style.display = 'none';
            writtenContainer.style.display = 'block';
            // Load existing written answer if any
            const existingWritten = writtenAnswers.find(a => a.questionIndex === index);
            writtenTextarea.value = existingWritten ? existingWritten.answer : '';

            // Add input event listener for written answers
            writtenTextarea.addEventListener('input', function() {
                const existing = writtenAnswers.find(a => a.questionIndex === currentQuestionIndex);
                if (existing) {
                    existing.answer = this.value;
                } else {
                    writtenAnswers.push({
                        questionIndex: currentQuestionIndex,
                        answer: this.value
                    });
                }
            });

            // Remove previous event listeners to avoid duplicates
            writtenTextarea.removeEventListener('input', handleWrittenInput);
            writtenTextarea.addEventListener('input', handleWrittenInput);
        }

        updateNavigationButtons();
    }

    function handleWrittenInput() {
        const existing = writtenAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (existing) {
            existing.answer = this.value;
        } else {
            writtenAnswers.push({
                questionIndex: currentQuestionIndex,
                answer: this.value
            });
        }
    }

    function updateNavigationButtons() {
        const totalQuestions = currentQuizData.questions.length;

        // Previous button
        if (currentQuestionIndex === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'inline-block';
        }

        // Next button
        if (currentQuestionIndex === totalQuestions - 1) {
            nextBtn.style.display = 'none';
            submitQuizBtn.style.display = 'inline-block';
        } else {
            nextBtn.style.display = 'inline-block';
            submitQuizBtn.style.display = 'none';
        }
    }
    
    function selectAnswer(e) {
        const selectedOption = e.currentTarget;
        const selectedAnswerIndex = parseInt(selectedOption.getAttribute('data-option-index'));

        // Remove 'selected' from siblings
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
        selectedOption.classList.add('selected');

        // Store the answer
        // Check if answer for this question already exists
        const existingAnswer = userAnswers.find(a => a.questionIndex === currentQuestionIndex);
        if (existingAnswer) {
            existingAnswer.answerIndex = selectedAnswerIndex;
        } else {
            userAnswers.push({
                questionIndex: currentQuestionIndex,
                answerIndex: selectedAnswerIndex
            });
        }
    }

    // Navigation button event listeners
    prevBtn.addEventListener('click', () => {
        if (currentQuestionIndex > 0) {
            displayQuestion(currentQuestionIndex - 1);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentQuestionIndex < currentQuizData.questions.length - 1) {
            displayQuestion(currentQuestionIndex + 1);
        }
    });

    // ===================================
    // 4. TIMER & SUBMISSION
    // ===================================
    function startTimer(duration) {
        timer = duration;
        timerInterval = setInterval(function () {
            let minutes = parseInt(timer / 60, 10);
            let seconds = parseInt(timer % 60, 10);
            minutes = minutes < 10 ? "0" + minutes : minutes;
            seconds = seconds < 10 ? "0" + seconds : seconds;
            timeLeftDisplay.textContent = `${minutes}:${seconds}`;

            if (--timer < 0) {
                submitQuiz("Time's up!");
            }
        }, 1000);
    }

    submitQuizBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to submit?')) {
            submitQuiz("User submitted");
        }
    });

    async function submitQuiz(reason, wasAutoSubmitted = false) {
        clearInterval(timerInterval); // Stop the clock
        removeSecurityListeners();
        
        console.log(`Submitting quiz. Reason: ${reason}`);
        quizContainer.style.display = 'none';

        // Show the correct modal
        if (wasAutoSubmitted) {
            autoSubmitModal.classList.add('active');
        } else {
            // Show a "submitting" message in the final modal
            finalSubmitModal.classList.add('active');
            finalSubmitModal.querySelector('h2').textContent = "Submitting...";
            finalSubmitModal.querySelector('p').textContent = "Please wait while we save your answers.";
        }

        try {
            // --- BACKEND CALL ---
            const response = await fetch(`${backendUrl}/results/submit`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    quizId: quizId,
                    answers: currentQuizData.questions.map((question, index) => {
                        const mcqAnswer = userAnswers.find(a => a.questionIndex === index);
                        const writtenAnswer = writtenAnswers.find(w => w.questionIndex === index);
                        return {
                            questionIndex: index,
                            selectedAnswer: mcqAnswer ? mcqAnswer.answerIndex : null,
                            writtenAnswer: writtenAnswer ? writtenAnswer.answer : '',
                            timeSpent: 0
                        };
                    }),
                    timeTaken: currentQuizData.duration * 60 - timer
                })
            });

            if (!response.ok) {
                if (response.status === 401) {
                    localStorage.removeItem('user');
                    localStorage.removeItem('token');
                    window.location.href = 'login.html';
                    return; // Silently redirect
                }
                if (response.status === 403) {
                    const data = await response.json();
                    throw new Error(data.message || 'Access denied.');
                }
                throw new Error('Failed to submit quiz.');
            }

            const data = await response.json();

            // Update the modal with the correct message
            finalSubmitModal.querySelector('h2').textContent = "Quiz Submitted!";
            if (data.result.status === 'pending') {
                finalSubmitModal.querySelector('p').textContent = "Your responses are saved. Results will be declared in 8-10 hours.";
            } else {
                finalSubmitModal.querySelector('p').textContent = `Your score: ${data.result.score} / ${data.result.totalQuestions}`;
            }

        } catch (error) {
            console.error('Submit Error:', error);
            finalSubmitModal.querySelector('h2').textContent = "Submission Failed!";
            finalSubmitModal.querySelector('p').textContent = "There was an error saving your results. Please contact support.";
        }
    }

    // ===================================
    // 5. ANTI-CHEATING SECURITY
    // ===================================
    function addSecurityListeners() {
        console.log("Attaching anti-cheating listeners.");
        if(!cheatingWarningBanner) {
            console.error("Cheating warning banner element missing.");
        }
        if(!violationCountDisplay) {
            console.error("Violation count display element missing.");
        }
        document.addEventListener("visibilitychange", handleVisibilityChange);
        document.body.addEventListener('copy', disableEvent);
        document.body.addEventListener('paste', disableEvent);
    }

    function removeSecurityListeners() {
        console.log("Removing anti-cheating listeners.");
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        document.body.removeEventListener('copy', disableEvent);
        document.body.removeEventListener('paste', disableEvent);
    }

    function handleVisibilityChange() {
        console.log("Visibility change event triggered.");
        if (document.hidden) {
            violationCount++;
            console.log(`Tab hidden. Violation count: ${violationCount}`);
            if(cheatingWarningBanner) cheatingWarningBanner.style.display = 'flex';
            if(violationCountDisplay) violationCountDisplay.textContent = violationCount;

            // Improved UI: Show warning message near violation count
            const warningElem = cheatingWarningBanner ? cheatingWarningBanner.querySelector('.warning-text') : null;
            if(warningElem) {
                warningElem.textContent = `Warning: You switched tabs ${violationCount} time${violationCount > 1 ? 's' : ''}. Limit is ${maxViolations} before auto-submit.`;
            }

            if (violationCount >= maxViolations) {
                console.log("Violation count exceeded max limit, submitting quiz...");
                submitQuiz("Cheating violation", true);
            }
        } else {
            // Hide warning when user returns to tab
            if(cheatingWarningBanner) cheatingWarningBanner.style.display = 'none';
            console.log("Tab visible again, hiding warning.");
        }
    }

    function disableEvent(e) {
        e.preventDefault();
        alert("This action is disabled during the quiz.");
        return false;
    }
    
    // --- Initial Load ---
    loadQuiz();
});
