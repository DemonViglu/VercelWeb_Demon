# Permission 申请相关

## Usage

- 在`AndroidManifest.xml`中添加如下语句，代表程序需要相关的权限。
	
	    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
	这是一个申请发送通知的权限申请。填写上面这句话后，程序的权限清单便会多此一条。

## 如何获取权限

### First Step，检查是否有该权限。
```kotlin
	context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)== PackageManager.PERMISSION_DENIED
```
- 通过这段话，可以知道`POST`权限是否拥有。

### Second Step，申请权限
- 如果有该权限，就可以进行发送通知操作，但如果没有，就要**准备**申请权限。
1. 调用
```
	ActivityCompat.shouldShowRequestPermissionRationale(activity,Manifest.permission.POST_NOTIFICATIONS)
```
代码，可以知道该软件的该权限能否再次委托系统帮助你申请权限。因为当用户多次拒绝该权限时，系统会默认屏蔽软件的此权限申请。
2. 如果有该委托资格，调用系统权限申请：
``` kotlin
ActivityCompat.requestPermissions(activity,new String[]{Manifest.permission.POST_NOTIFICATIONS},NotificationRequestCode);
```
3. 如果没有资格，则需要建立`Intent`来指导用户手动前往系统界面进行程序申请。
``` kotlin
    private void ShowPermissionSetttingDialog(){

        AlertDialog.Builder builder = new AlertDialog.Builder(context);
        builder.setTitle("Ask for right");
        builder.setMessage("Why you refuse me T-T");
        builder.setPositiveButton("GO", new DialogInterface.OnClickListener() {
            @Override
            public void onClick(DialogInterface dialog, int which) {
                Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                Uri uri = Uri.fromParts("package", context.getPackageName(), null);
                intent.setData(uri);
                activity.startActivity(intent);
            }
        });
        builder.setNegativeButton("QAQ",null);
        builder.show();
    }
```

# 如何发送通知

- 一则通知包含Manager,Channel,Compat三方共同工作。emmm懒得写了，直接看代码把。下文代码一共包含了，如何点击通知跳转到应用，如何发送通知，如何申请权限。

??? note "EX"
    ``` kotlin
    package com.example.tutoriol.Core;
    import android.Manifest;
    import android.app.Activity;
    import android.app.AlertDialog;
    import android.app.NotificationChannel;
    import android.app.NotificationManager;
    import android.app.PendingIntent;
    import android.app.TaskStackBuilder;
    import android.content.Context;
    import android.content.DialogInterface;
    import android.content.Intent;
    import android.content.pm.PackageManager;
    import android.net.Uri;
    import android.os.Build;
    import android.provider.Settings;

    import androidx.core.app.ActivityCompat;
    import androidx.core.app.NotificationCompat;

    import com.example.tutoriol.MainActivity;
    import com.example.tutoriol.R;

    public class SendNotification extends Activity {

        Context context;
        Activity activity;

        String ChannelID;
        CharSequence ChannelName;
        String ChannelDescription;
        int Importance;
        NotificationChannel NC;
        NotificationManager NM;

        int NotificationRequestCode = 38;
        String NotificationGroup = "Ding~";
        int NotificationID = 5238;

        PendingIntent ResultPendingIntent;

        public SendNotification(Context _context, Activity _activity){
            context = _context;
            activity = _activity;

            CreateNavIntent();

            if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            {
                //Create a channel
                ChannelID = "Demon";
                ChannelName = "DEFAULT CHANNEL NAME";
                ChannelDescription = "DEFAULT CHANNEL DESCRIPTION";
                Importance = NotificationManager.IMPORTANCE_HIGH;
                NC = new NotificationChannel(ChannelID,ChannelName,Importance);
                NC.setDescription(ChannelDescription);

                NM = (NotificationManager) context.getSystemService(NotificationManager.class);
                NM.createNotificationChannel(NC);
            }
        }

        private void CreateNavIntent(){
            // Create an Intent for the activity you want to start.

            Intent resultIntent = new Intent(context, MainActivity.class);
    // Create the TaskStackBuilder and add the intent, which inflates the back
    // stack.
            TaskStackBuilder stackBuilder = TaskStackBuilder.create(context);
            stackBuilder.addNextIntentWithParentStack(resultIntent);
    // Get the PendingIntent containing the entire back stack.
            ResultPendingIntent =
                    stackBuilder.getPendingIntent(0,
                            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        }


        public void SendNotifi(String note){
            if(Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            {
                //Check Permission
                if(context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)== PackageManager.PERMISSION_DENIED){
                    if(ActivityCompat.shouldShowRequestPermissionRationale(activity,Manifest.permission.POST_NOTIFICATIONS)){
                        ActivityCompat.requestPermissions(activity,new String[]{Manifest.permission.POST_NOTIFICATIONS},NotificationRequestCode);
                    }
                    else{
                        ShowPermissionSetttingDialog();
                    }
                }

                //Create a Ntion
                NotificationCompat.Builder builder = new NotificationCompat.Builder(context, ChannelID)
                        .setSmallIcon(R.drawable.ic_launcher_foreground)
                        .setContentTitle("ContentTile")
                        .setContentIntent(ResultPendingIntent)
                        .setContentText("TextContent: You have set a date!\n"+note)
                        .setAutoCancel(true)
                        .setGroup(NotificationGroup)
                        .setGroupSummary(false)
                        .setPriority(NotificationCompat.PRIORITY_HIGH
                        );

                //Action
                NM.notify(NotificationID++,builder.build());
            }
        }

        @Override
        public void onRequestPermissionsResult(int requestCode, String[] permissions,
                                            int[] grantResults) {
            switch (requestCode) {
                case 38:
                    // If request is cancelled, the result arrays are empty.
                    if (grantResults.length > 0 &&
                            grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                        // Permission is granted. Continue the action or workflow
                        // in your app.
                    }  else {
                        // Explain to the user that the feature is unavailable because
                        // the feature requires a permission that the user has denied.
                        // At the same time, respect the user's decision. Don't link to
                        // system settings in an effort to convince the user to change
                        // their decision.
                        System.exit(0);
                    }
                    return;
            }
        }

        private void ShowPermissionSetttingDialog(){

            AlertDialog.Builder builder = new AlertDialog.Builder(context);
            builder.setTitle("Ask for right");
            builder.setMessage("Why you refuse me T-T");
            builder.setPositiveButton("GO", new DialogInterface.OnClickListener() {
                @Override
                public void onClick(DialogInterface dialog, int which) {
                    Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
                    Uri uri = Uri.fromParts("package", context.getPackageName(), null);
                    intent.setData(uri);
                    activity.startActivity(intent);
                }
            });
            builder.setNegativeButton("QAQ",null);
            builder.show();
        }
    }
    ```