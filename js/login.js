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
                    errorMsg = "نام کاربری یا رمز عبور اشتباه است";
                } else if (errorMsg === "Invalid username or password") {
                    errorMsg = "نام کاربری یا رمز عبور نامعتبر است";
                }
                
                document.getElementById("error-text").innerHTML = errorMsg;
            }
        }
        catch (e) {
            document.getElementById("error-text").innerHTML = "خطای نامشخص رخ داده است";
        }
    });
}