self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Central Contábil", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Central Contábil";
  const options = {
    body: data.body || "",
    icon: "/navecon-logo.png",
    badge: "/navecon-logo.png",
    data: { href: data.href || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const href = (event.notification.data && event.notification.data.href) || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(href) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(href);
    }),
  );
});
