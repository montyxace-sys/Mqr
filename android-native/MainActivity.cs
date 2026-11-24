using Android.App;
using Android.OS;
using Android.Views;
using Android.Webkit;
using Android.Util;
using Android.Widget;
using Android.Content.PM;

namespace MQrApp;

[Activity(Label = "@string/app_name", MainLauncher = true)]
public class MainActivity : Activity
{
    WebView? _webView;

    protected override void OnCreate(Bundle? savedInstanceState)
    {
        base.OnCreate(savedInstanceState);

        // Request camera permission at runtime (Android 6+)
        if (CheckSelfPermission(Android.Manifest.Permission.Camera) != Permission.Granted)
        {
            RequestPermissions(new string[] { Android.Manifest.Permission.Camera }, 1);
        }

        try
        {
            _webView = new WebView(this);
            SetContentView(_webView);

            var settings = _webView.Settings;
            settings.JavaScriptEnabled = true;
            settings.DomStorageEnabled = true;
            settings.AllowFileAccess = true;
            settings.AllowContentAccess = true;
            settings.MediaPlaybackRequiresUserGesture = false;
            settings.LoadsImagesAutomatically = true;
            settings.DefaultTextEncodingName = "UTF-8";

            _webView.SetWebViewClient(new WebViewClient());
            _webView.SetWebChromeClient(new CameraWebChromeClient(this));

            _webView.LoadUrl("file:///android_asset/index.html");
        }
        catch (System.Exception ex)
        {
            Log.Error("MQr", $"OnCreate exception: {ex}");
            var tv = new TextView(this);
            tv.Text = $"Error: {ex.Message}";
            SetContentView(tv);
        }
    }

    protected override void OnDestroy()
    {
        try { _webView?.StopLoading(); _webView?.Destroy(); } catch { }
        base.OnDestroy();
    }

    public override void OnBackPressed()
    {
        if (_webView != null && _webView.CanGoBack())
        {
            _webView.GoBack();
            return;
        }
        try { _webView?.EvaluateJavascript("if(window.goBack) window.goBack();", null); } catch { }
        base.OnBackPressed();
    }

    // WebChromeClient that grants camera permission to WebView
    class CameraWebChromeClient : WebChromeClient
    {
        private readonly Activity _activity;
        public CameraWebChromeClient(Activity activity) { _activity = activity; }

        public override void OnPermissionRequest(PermissionRequest? request)
        {
            if (request != null)
            {
                // Grant all requested permissions (camera, etc.)
                request.Grant(request.GetResources());
            }
        }
    }
}
