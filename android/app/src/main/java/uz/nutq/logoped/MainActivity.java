package uz.nutq.logoped;

import android.app.Activity;
import android.app.DownloadManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.view.Gravity;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;
import android.webkit.ValueCallback;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;
import java.net.URI;

public class MainActivity extends Activity {
    private WebView web;
    private LinearLayout root;
    private String serverUrl;
    private ValueCallback<Uri[]> fileSelection;
    private static final int CHOOSE_PHOTO = 41;
    private final int green = Color.rgb(19,126,114);

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        serverUrl = getPreferences(MODE_PRIVATE).getString("server", "");
        if (serverUrl.isEmpty()) showSetup(""); else showApp();
    }
    private int dp(int value) { return Math.round(value * getResources().getDisplayMetrics().density); }
    private LinearLayout layout() {
        if(web != null) { web.stopLoading(); web.destroy(); web = null; }
        root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL); root.setBackgroundColor(Color.WHITE);
        root.setOnApplyWindowInsetsListener((view,insets)->{
            if(android.os.Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars=insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime());
                view.setPadding(bars.left,bars.top,bars.right,bars.bottom);
            } else view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(root); return root;
    }
    private TextView text(String value,int size,int color) {
        TextView v = new TextView(this);v.setText(value);v.setTextSize(size);v.setTextColor(color);v.setPadding(0,dp(9),0,dp(9));return v;
    }
    private Button button(String title) { Button b=new Button(this);b.setText(title);b.setAllCaps(false);return b; }
    private void showSetup(String message) {
        layout();
        LinearLayout content=new LinearLayout(this);content.setOrientation(LinearLayout.VERTICAL);content.setGravity(Gravity.CENTER_VERTICAL);content.setPadding(dp(28),dp(20),dp(28),dp(20));root.addView(content,new LinearLayout.LayoutParams(-1,-1));
        content.addView(text("nutq.",46,green));
        content.addView(text("Logopedning ish maydoni",22,Color.rgb(35,63,67)));
        content.addView(text("Veb va telefon bir xil ma’lumotlardan foydalanishi uchun server manzilini kiriting.",15,Color.GRAY));
        EditText address=new EditText(this);address.setSingleLine(true);address.setInputType(android.text.InputType.TYPE_CLASS_TEXT|android.text.InputType.TYPE_TEXT_VARIATION_URI);address.setHint("https://nutq.example.uz");address.setText(serverUrl);address.setContentDescription("Server manzili");content.addView(address,new LinearLayout.LayoutParams(-1,dp(60)));
        if(BuildConfig.DEBUG) content.addView(text("Mahalliy sinov: telefon va kompyuterni bitta Wi-Fi tarmog‘iga ulang. Masalan: http://192.168.1.10:3001",13,Color.GRAY));
        TextView error=text(message,13,Color.rgb(175,65,65));content.addView(error);
        Button connect=button("Serverga ulanish");content.addView(connect);
        connect.setOnClickListener(v->{
            String input=address.getText().toString().trim();
            try {
                URI uri=new URI(input);
                String host=uri.getHost();String scheme=uri.getScheme();
                boolean https="https".equals(scheme);
                boolean local=isLocalHost(host);
                if(host==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null||(!https&&!(BuildConfig.DEBUG&&"http".equals(scheme)&&local))||!(uri.getPath().isEmpty()||uri.getPath().equals("/"))) throw new Exception();
                int port=uri.getPort();
                if((https&&port==443)||(!https&&port==80))port=-1;
                String next=new URI(scheme,null,host.toLowerCase(java.util.Locale.ROOT),port,null,null,null).toString();
                if(!next.equals(serverUrl)) {
                    CookieManager.getInstance().removeAllCookies(done->{ CookieManager.getInstance().flush(); serverUrl=next;getPreferences(MODE_PRIVATE).edit().putString("server",serverUrl).apply();showApp(); });
                } else showApp();
            } catch(Exception e) { error.setText(BuildConfig.DEBUG?"HTTPS manzil yoki mahalliy IP kiriting. Misol: http://192.168.1.10:3001":"To‘liq HTTPS server manzilini kiriting."); }
        });
    }
    private boolean isLocalHost(String host) {
        if(host==null)return false;
        if(host.equals("localhost")||host.equals("127.0.0.1"))return true;
        if(!host.matches("[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+"))return false;
        try {
            String[] parts=host.split("\\.");int[] n=new int[4];
            for(int i=0;i<4;i++){n[i]=Integer.parseInt(parts[i]);if(n[i]>255)return false;}
            return n[0]==10||(n[0]==192&&n[1]==168)||(n[0]==172&&n[1]>=16&&n[1]<=31);
        }catch(NumberFormatException e){return false;}
    }
    private boolean sameOrigin(String url) {
        try { URI a=new URI(serverUrl),b=new URI(url);int ap=a.getPort()<0?(a.getScheme().equals("https")?443:80):a.getPort();int bp=b.getPort()<0?(b.getScheme().equals("https")?443:80):b.getPort();return a.getScheme().equals(b.getScheme())&&a.getHost().equalsIgnoreCase(b.getHost())&&ap==bp; }catch(Exception e){return false;}
    }
    @SuppressWarnings("SetJavaScriptEnabled") private void showApp() {
        layout();
        LinearLayout bar=new LinearLayout(this);bar.setGravity(Gravity.CENTER_VERTICAL);bar.setPadding(dp(12),0,dp(8),0);
        TextView brand=text("nutq.",19,green);bar.addView(brand,new LinearLayout.LayoutParams(0,dp(48),1));
        Button refresh=button("Yangilash");refresh.setTextSize(11);bar.addView(refresh);
        Button settings=button("Server");settings.setTextSize(11);bar.addView(settings);settings.setOnClickListener(v->showSetup(""));
        root.addView(bar,new LinearLayout.LayoutParams(-1,dp(48)));
        web=new WebView(this);root.addView(web,new LinearLayout.LayoutParams(-1,0,1));
        web.getSettings().setJavaScriptEnabled(true);web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);web.getSettings().setAllowContentAccess(false);
        web.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(fileSelection!=null)fileSelection.onReceiveValue(null);
                fileSelection=callback;
                Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);
                pick.addCategory(Intent.CATEGORY_OPENABLE);pick.setType("image/*");
                try{startActivityForResult(pick,CHOOSE_PHOTO);}catch(Exception e){fileSelection.onReceiveValue(null);fileSelection=null;Toast.makeText(MainActivity.this,"Rasm tanlash oynasi ochilmadi",Toast.LENGTH_SHORT).show();}
                return true;
            }
        });
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !sameOrigin(request.getUrl().toString());}
            @Override public void onReceivedError(WebView view,WebResourceRequest request,WebResourceError error){if(request.isForMainFrame())view.post(()->{if(web==view)showSetup("Serverga ulanib bo‘lmadi. Server ishlayotganini va tarmoqni tekshiring.");});}
            @Override public void onPageFinished(WebView view,String url){CookieManager.getInstance().flush();}
        });
        web.setDownloadListener((url,agent,disposition,mime,length)->{
            if(!sameOrigin(url))return;
            try {
                DownloadManager.Request request=new DownloadManager.Request(Uri.parse(url));
                String cookie=CookieManager.getInstance().getCookie(url);if(cookie!=null)request.addRequestHeader("Cookie",cookie);
                request.setTitle("Nutq ma’lumotlari");request.setMimeType("application/json");request.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
                request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS,"nutq-"+System.currentTimeMillis()+".json");
                ((DownloadManager)getSystemService(Context.DOWNLOAD_SERVICE)).enqueue(request);
                Toast.makeText(this,"Yuklab olish boshlandi",Toast.LENGTH_SHORT).show();
            }catch(Exception e){Toast.makeText(this,"Yuklab bo‘lmadi. Veb versiyada qayta urinib ko‘ring.",Toast.LENGTH_LONG).show();}
        });
        refresh.setOnClickListener(v->{if(web!=null)web.reload();});
        web.loadUrl(serverUrl);
    }
    @Override public void onBackPressed(){if(web!=null&&web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onActivityResult(int requestCode,int resultCode,Intent data){
        super.onActivityResult(requestCode,resultCode,data);
        if(requestCode==CHOOSE_PHOTO&&fileSelection!=null){fileSelection.onReceiveValue(resultCode==RESULT_OK&&data!=null&&data.getData()!=null?new Uri[]{data.getData()}:null);fileSelection=null;}
    }
    @Override protected void onDestroy(){if(fileSelection!=null){fileSelection.onReceiveValue(null);fileSelection=null;}if(web!=null){web.destroy();web=null;}super.onDestroy();}
}
