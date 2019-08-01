from threading import Timer

#from imageProcessingHub.TGD import ObjectDetectionCamera
import mainFaceDetection

# def waitForInput():
#     while True:
#         print("xx--give--command--xx")
#         dummyInput = input()
#         if dummyInput == "q":
#             break
#         elif dummyInput == "detect":
#             ObjectDetectionCamera.detect_threat()
#         else:
#             ipSplit = dummyInput.split("::")
#             if ipSplit[0] == "track":
#                 print(ipSplit)
#                 Timer(float(ipSplit[2]), mainFaceDetection.stopTracker).start()
#                 mainFaceDetection.startTracking(ipSplit[1])
            

# waitForInput()