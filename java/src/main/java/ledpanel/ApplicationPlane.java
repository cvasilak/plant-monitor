package swim.plantmonitor;

import swim.api.SwimRoute;
import swim.api.agent.AgentRoute;
import swim.api.plane.AbstractPlane;
import swim.api.space.Space;
import swim.kernel.Kernel;
import swim.server.ServerLoader;
import swim.structure.Value;
import swim.uri.Uri;

/**
  The ApplicationPlane is the top level of the app.
  This Swim Plane defines the routes to each WebAgent
 */
public class ApplicationPlane extends AbstractPlane {

  /*
    see ../resources/server.recon for web agent definitions
  */

  /**
   * main application loop
   * @param args
   * @throws InterruptedException
   */
  public static void main(String[] args) throws InterruptedException {

    final Kernel kernel = ServerLoader.loadServer();
    final Space space = kernel.getSpace("plantmonitor");

    kernel.start();
    System.out.println("Running Swim Plant Montior Server...");
    kernel.run();
        
  }
}
