import java.awt.Container;
import java.awt.GridLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.awt.Desktop;
import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;
import java.io.PrintWriter;

import javax.swing.JButton;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JPanel;

/**
 * DrawGraphInBrowser
 */
public class DrawGraphInBrowser extends JFrame implements ActionListener
{
  private static final long serialVersionUID = 1L;

  private final JButton drawInBrowserButton = new JButton("Open in default browser");
  String[] styleOptions = { "random", "polygon", "topologically sorted" };
  private final JComboBox<String> styleOptionComboBox = new JComboBox<>(styleOptions);

  public DrawGraphInBrowser()
  {
    setTitle("Graph Viewer");
    Container contents = getContentPane();
    contents.setLayout(new GridLayout(2, 1));

    JPanel chooseStylePanel = new JPanel();
    chooseStylePanel.setLayout(new GridLayout(0, 2));
    chooseStylePanel.add(new JLabel("Pick the style of graph display: "));
    chooseStylePanel.add(styleOptionComboBox);
    contents.add(chooseStylePanel);

    drawInBrowserButton.addActionListener(this);
    contents.add(drawInBrowserButton);
    setDefaultCloseOperation(EXIT_ON_CLOSE);
    pack();
  }

  public static void main(String[] args) throws Exception
  {
    new DrawGraphInBrowser().setVisible(true);
  }

  private static void addStyleToJSONFile(String style) throws IOException
  {
    PrintWriter output;
    BufferedReader reader;
    reader = new BufferedReader(new FileReader("graph.json"));
    output = new PrintWriter(new FileWriter("app\\input.json"));

    output.println("{");
    output.println("\"visualFormat\": " + "\"" + style + "\",");

    String line;
    reader.readLine();
    while ((line = reader.readLine()) != null)
    {
      if (!line.contains("visualFormat"))
      {
        output.println(line);
      }
    }
    reader.close();
    output.close();

  }

  @Override
  public void actionPerformed(ActionEvent event)
  {
    if (event.getSource() == drawInBrowserButton)
    {
      File htmlFile = new File("app\\index.html");
      try
      {
        addStyleToJSONFile((String) styleOptionComboBox.getSelectedItem());
        Desktop.getDesktop().browse(htmlFile.toURI());
      }
      catch (Exception exception)
      {
        System.out.println(exception);
      }
    }
  }

}