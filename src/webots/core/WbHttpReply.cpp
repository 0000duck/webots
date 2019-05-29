#include "WbHttpReply.hpp"

#include <QtCore/QFile>
#include <QtCore/QFileInfo>

// Remarks:
// - "Access-Control-Allow-Origin" is to solve this error appearing at least on Chrome:
//    `Error: No 'Access-Control-Allow-Origin' header is present on the requested resource`

QByteArray WbHttpReply::forge404Reply() {
  static QByteArray reply;
  if (reply.isEmpty()) {
    reply.append("HTTP/1.1 404 Not Found\r\n");
    reply.append("Access-Control-Allow-Origin: *\r\n");
  }
  return reply;
}

QByteArray WbHttpReply::forgeHTMLReply(const QString &htmlContent) {
  QByteArray reply;
  reply.append("HTTP/1.1 200 OK\r\n");
  reply.append("Access-Control-Allow-Origin: *\r\n");
  reply.append("Content-Type: text/html\r\n");
  reply.append(QString("Content-Length: %1\r\n").arg(htmlContent.length()));
  reply.append("\r\n");
  reply.append(htmlContent);
  return reply;
}

QByteArray WbHttpReply::forgeImageReply(const QString &imageFileName) {
  QByteArray reply;

  QFile imageFile(imageFileName);
  if (!imageFile.open(QIODevice::ReadOnly))
    return forge404Reply();

  QByteArray imageData = imageFile.readAll();
  int imageSize = imageData.length();
  QFileInfo fi(imageFile);
  QString imageExtension = fi.suffix().toLower();

  reply.append("HTTP/1.1 200 OK\r\n");
  reply.append("Access-Control-Allow-Origin: *\r\n");
  reply.append(QString("Content-Type: image/%1\r\n").arg(imageExtension));
  reply.append(QString("Content-Length: %1\r\n").arg(imageSize));
  reply.append("\r\n");
  reply.append(imageData);

  return reply;
}
