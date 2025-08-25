export interface CheckResult {
  status: 'online' | 'offline';
  responseTime?: number;
  error?: string;
}

export async function checkWebsiteStatus(url: string): Promise<CheckResult> {
  const startTime = Date.now();
  
  console.log(`🔍 [DEBUG] Starting check for: ${url}`);
  
  try {
    // Ensure URL has protocol
    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = `https://${fullUrl}`;
    }
    
    console.log(`🌐 [DEBUG] Full URL: ${fullUrl}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log(`⏰ [DEBUG] Timeout triggered for ${fullUrl}`);
      controller.abort();
    }, 15000); // 15 second timeout
    
    console.log(`📡 [DEBUG] Making fetch request to ${fullUrl}`);
    
    // Try HEAD first, fallback to GET if HEAD fails
    let response;
    try {
      console.log(`📤 [DEBUG] Attempting HEAD request to ${fullUrl}`);
      response = await fetch(fullUrl, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Website Monitor App/1.0',
          'Accept': '*/*',
        },
        // Add mode for web compatibility
        mode: 'cors',
      });
      console.log(`✅ [DEBUG] HEAD request successful for ${fullUrl}`);
    } catch (headError) {
      console.log(`❌ [DEBUG] HEAD request failed for ${fullUrl}:`, headError);
      console.log(`📤 [DEBUG] Attempting GET request to ${fullUrl}`);
      // Fallback to GET request
      response = await fetch(fullUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Website Monitor App/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        mode: 'cors',
      });
      console.log(`✅ [DEBUG] GET request successful for ${fullUrl}`);
    }
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    console.log(`📊 [DEBUG] Response for ${fullUrl}: Status ${response.status}, Time ${responseTime}ms`);
    console.log(`📋 [DEBUG] Response headers:`, Object.fromEntries(response.headers.entries()));
    
    // Consider 2xx and 3xx as online
    if (response.status >= 200 && response.status < 400) {
      const result = {
        status: 'online' as const,
        responseTime,
      };
      console.log(`🟢 [DEBUG] Website ${fullUrl} is ONLINE:`, result);
      return result;
    } else {
      const result = {
        status: 'offline' as const,
        error: `HTTP ${response.status}`,
      };
      console.log(`🔴 [DEBUG] Website ${fullUrl} is OFFLINE:`, result);
      return result;
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    console.log(`💥 [DEBUG] Exception caught for ${url}:`, error);
    console.log(`💥 [DEBUG] Error type:`, typeof error);
    console.log(`💥 [DEBUG] Error constructor:`, error?.constructor?.name);
    
    if (error instanceof Error) {
      console.log(`💥 [DEBUG] Error name: ${error.name}`);
      console.log(`💥 [DEBUG] Error message: ${error.message}`);
      console.log(`💥 [DEBUG] Error stack:`, error.stack);
      
      if (error.name === 'AbortError') {
        const result = {
          status: 'offline' as const,
          error: 'Request timeout (15s)',
        };
        console.log(`⏰ [DEBUG] Timeout result:`, result);
        return result;
      }
      
      // Handle CORS and network errors
      if (error.message.includes('CORS') || error.message.includes('Network')) {
        const result = {
          status: 'offline' as const,
          error: 'Network/CORS error',
        };
        console.log(`🚫 [DEBUG] CORS/Network error result:`, result);
        return result;
      }
      
      const result = {
        status: 'offline' as const,
        error: error.message,
      };
      console.log(`❌ [DEBUG] Generic error result:`, result);
      return result;
    }
    
    const result = {
      status: 'offline' as const,
      error: 'Unknown error',
    };
    console.log(`❓ [DEBUG] Unknown error result:`, result);
    return result;
  }
}