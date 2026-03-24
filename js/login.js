function loginSubmited() {
    document.getElementById("error-text").innerHTML = "";
    var postData = {};
    postData.username = document.getElementById("username").value;
    postData.password = document.getElementById("password").value;

    ajax.post('../api/login', postData, function(responseText) {
        try {
            var obj = JSON.parse(responseText);
            if(obj.success) {
                document.getElementById("error-text").innerHTML = "";
                location.reload();
            }
            else {
                var errorMsg = obj.data.error;

                if (errorMsg === "Wrong username and/or password") {
                    errorMsg = "Wrong username or password";
                } else if (errorMsg === "Invalid username or password") {
                    errorMsg = "Invalid username or password";
                }

                document.getElementById("error-text").innerHTML = errorMsg;
            }
        }
        catch (e) {
            document.getElementById("error-text").innerHTML = "An unknown error occurred";
        }
    });
}
