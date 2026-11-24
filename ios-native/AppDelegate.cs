using System.IO;
using Foundation;
using UIKit;
using WebKit;

namespace MQrIOS;

[Register("AppDelegate")]
public class AppDelegate : UIApplicationDelegate
{
    public override UIWindow? Window { get; set; }

    public override bool FinishedLaunching(UIApplication app, NSDictionary? options)
    {
        Window = new UIWindow(UIScreen.MainScreen.Bounds);

        var webView = new WKWebView(Window.Bounds, new WKWebViewConfiguration());
        var path = Path.Combine(NSBundle.MainBundle.BundlePath, "Assets", "index.html");

        if (!File.Exists(path))
        {
            var label = new UILabel(Window.Bounds) { Text = "No se encontraron los recursos de MQr.", TextAlignment = UITextAlignment.Center };
            Window.AddSubview(label);
        }
        else
        {
            webView.LoadRequest(new NSUrlRequest(NSUrl.FromFilename(path)));
            webView.AutoresizingMask = UIViewAutoresizing.FlexibleWidth | UIViewAutoresizing.FlexibleHeight;
            Window.AddSubview(webView);
        }

        Window.MakeKeyAndVisible();
        return true;
    }
}
