/*
|--------------------------------------------------------------------------
| SUPABASE CONFIG
|--------------------------------------------------------------------------
|
| IMPORTANT:
| Use your PUBLIC/PUBLISHABLE key here.
|
| NEVER put your Supabase service_role / secret key here.
|
*/

const SUPABASE_URL =
    "https://YOUR_PROJECT.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "YOUR_SUPABASE_PUBLISHABLE_KEY";


/*
|--------------------------------------------------------------------------
| CREATE SUPABASE CLIENT
|--------------------------------------------------------------------------
*/

const supabaseClient =
    window.supabase.createClient(
        "https://stioetqppmaxivpcjzot.supabase.co",
        "sb_publishable_z0hIBINoVuad1f_LodYylg_lMfWh05p",
        {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: true
            }
        }
    );


/*
|--------------------------------------------------------------------------
| ELEMENTS
|--------------------------------------------------------------------------
*/

const loadingScreen =
    document.getElementById("loadingScreen");

const resetScreen =
    document.getElementById("resetScreen");

const successScreen =
    document.getElementById("successScreen");

const errorScreen =
    document.getElementById("errorScreen");

const resetForm =
    document.getElementById("resetForm");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const errorMessage =
    document.getElementById("errorMessage");

const updateButton =
    document.getElementById("updateButton");

const togglePassword =
    document.getElementById("togglePassword");

const strengthBar =
    document.getElementById("strengthBar");

const strengthText =
    document.getElementById("strengthText");


/*
|--------------------------------------------------------------------------
| SCREEN MANAGEMENT
|--------------------------------------------------------------------------
*/

function showScreen(screen) {

    document
        .querySelectorAll(".screen")
        .forEach(element => {
            element.classList.remove("active");
        });

    screen.classList.add("active");
}


/*
|--------------------------------------------------------------------------
| ERROR MESSAGE
|--------------------------------------------------------------------------
*/

function showError(message) {

    errorMessage.textContent = message;

    errorMessage.style.display = "block";
}


function clearError() {

    errorMessage.textContent = "";

    errorMessage.style.display = "none";
}


/*
|--------------------------------------------------------------------------
| SUPABASE AUTH STATE
|--------------------------------------------------------------------------
|
| When the recovery link is opened, Supabase detects the
| recovery session from the URL.
|
| Supabase then fires:
|
| PASSWORD_RECOVERY
|
*/

const {
    data: authListener
} = supabaseClient.auth.onAuthStateChange(
    (event, session) => {

        console.log(
            "Supabase auth event:",
            event
        );


        /*
        |--------------------------------------------------------------------------
        | PASSWORD RECOVERY
        |--------------------------------------------------------------------------
        */

        if (
            event === "PASSWORD_RECOVERY" &&
            session
        ) {

            console.log(
                "Password recovery session created"
            );

            showScreen(resetScreen);
        }


        /*
        |--------------------------------------------------------------------------
        | INITIAL SESSION
        |--------------------------------------------------------------------------
        */

        if (event === "INITIAL_SESSION") {

            /*
             * Do not immediately show the reset screen here.
             *
             * PASSWORD_RECOVERY is the event we care about.
             */

            setTimeout(() => {

                supabaseClient.auth
                    .getSession()
                    .then(({ data }) => {

                        if (!data.session) {

                            /*
                             * If there is no session and
                             * we didn't receive PASSWORD_RECOVERY,
                             * the link is probably invalid.
                             */

                            showScreen(errorScreen);
                        }

                    });

            }, 1000);
        }

    }
);


/*
|--------------------------------------------------------------------------
| PASSWORD RESET
|--------------------------------------------------------------------------
*/

resetForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        clearError();


        const password =
            passwordInput.value.trim();

        const confirmPassword =
            confirmPasswordInput.value.trim();


        /*
        |--------------------------------------------------------------------------
        | VALIDATION
        |--------------------------------------------------------------------------
        */

        if (!password) {

            showError(
                "Please enter a new password."
            );

            return;
        }


        if (password.length < 8) {

            showError(
                "Password must contain at least 8 characters."
            );

            return;
        }


        if (password !== confirmPassword) {

            showError(
                "Passwords do not match."
            );

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | CHECK RECOVERY SESSION
        |--------------------------------------------------------------------------
        */

        const {
            data: {
                session
            },
            error: sessionError
        } = await supabaseClient.auth.getSession();


        if (
            sessionError ||
            !session
        ) {

            showError(
                "Your password reset session has expired. Please request a new reset link."
            );

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | DISABLE BUTTON
        |--------------------------------------------------------------------------
        */

        updateButton.disabled = true;

        updateButton.textContent =
            "Updating...";


        /*
        |--------------------------------------------------------------------------
        | UPDATE PASSWORD
        |--------------------------------------------------------------------------
        |
        | This is the key operation.
        |
        | The recovery session allows Supabase to know
        | which user's password should be changed.
        |
        */

        const {
            error
        } = await supabaseClient.auth.updateUser({
            password: password
        });


        /*
        |--------------------------------------------------------------------------
        | HANDLE ERROR
        |--------------------------------------------------------------------------
        */

        if (error) {

            console.error(
                "Password update error:",
                error
            );

            showError(
                error.message ||
                "Unable to update your password."
            );

            updateButton.disabled = false;

            updateButton.textContent =
                "Update Password";

            return;
        }


        /*
        |--------------------------------------------------------------------------
        | SUCCESS
        |--------------------------------------------------------------------------
        */

        showScreen(successScreen);

    }
);


/*
|--------------------------------------------------------------------------
| PASSWORD VISIBILITY
|--------------------------------------------------------------------------
*/

togglePassword.addEventListener(
    "click",
    () => {

        const isPassword =
            passwordInput.type === "password";


        passwordInput.type =
            isPassword
                ? "text"
                : "password";


        togglePassword.textContent =
            isPassword
                ? "Hide"
                : "Show";

    }
);


/*
|--------------------------------------------------------------------------
| PASSWORD STRENGTH
|--------------------------------------------------------------------------
*/

passwordInput.addEventListener(
    "input",
    () => {

        const password =
            passwordInput.value;


        let strength = 0;


        if (password.length >= 8) {
            strength++;
        }


        if (/[A-Z]/.test(password)) {
            strength++;
        }


        if (/[0-9]/.test(password)) {
            strength++;
        }


        if (/[^A-Za-z0-9]/.test(password)) {
            strength++;
        }


        const percentage =
            strength * 25;


        strengthBar.style.width =
            `${percentage}%`;


        if (!password) {

            strengthText.textContent =
                "Use at least 8 characters";

        }
        else if (strength === 1) {

            strengthText.textContent =
                "Weak password";

        }
        else if (strength === 2) {

            strengthText.textContent =
                "Fair password";

        }
        else if (strength === 3) {

            strengthText.textContent =
                "Good password";

        }
        else {

            strengthText.textContent =
                "Strong password";

        }

    }
);


/*
|--------------------------------------------------------------------------
| CONTINUE BUTTON
|--------------------------------------------------------------------------
*/

document
    .getElementById("continueButton")
    .addEventListener(
        "click",
        async () => {

            /*
             * Sign out of the temporary recovery session.
             *
             * Remove this if you want the user to remain
             * signed in after resetting the password.
             */

            await supabaseClient.auth.signOut();


            /*
             * Change this to your actual application.
             */

            window.location.href =
                "http://localhost:3000";

        }
    );


/*
|--------------------------------------------------------------------------
| RETRY BUTTON
|--------------------------------------------------------------------------
*/

document
    .getElementById("retryButton")
    .addEventListener(
        "click",
        () => {

            /*
             * Change this to your actual
             * login / forgot password page.
             */

            window.location.href =
                "http://localhost:3000/forgot-password";

        }
    );


/*
|--------------------------------------------------------------------------
| CLEANUP
|--------------------------------------------------------------------------
*/

window.addEventListener(
    "beforeunload",
    () => {

        authListener.subscription.unsubscribe();

    }
);
