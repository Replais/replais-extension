import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ThemeToggle } from '../components/theme-toggle';

export default function Popup() {
const handleClick = () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          const tab = tabs[0];
          if (!tab?.id) return;
    
          chrome.tabs.sendMessage(tab.id, { type: 'SUGGEST_REPLY' }, () => {
            const err = chrome.runtime.lastError;
            // Ignore "receiving end does not exist" when there's no content script on that page
            if (err && !err.message?.includes('Receiving end does not exist')) {
              console.warn('[ReplAIs] sendMessage error:', err.message);
            }
          });
        });
};
  return (
    <div className="p-3 w-[280px] font-sans">
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">ReplAIs</CardTitle>
          <ThemeToggle />
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Grammarly for replies. Don't know what to say? We do! in your voice.
          </p>
          <Button
            className="w-full"
            onClick={handleClick}
          >
            Suggest Reply
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}