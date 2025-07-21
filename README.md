This the working version the only issue is the flutter_webrtc versions i tried are too old for my Flutter project. This project uses the new Android V2 embedding system, but the plugin is trying 
to use the old Registrar system, causing the build to fail. The solution is to upgrade to a truly modern version of the package and update your Android project's Java version to match. But the issue 
is im getting many compilation errors.(In this version peer to peer connection establishment and everything works really well the only issue is audio transmission)

