import path from "path"
import fs from "fs-extra"
import { rest } from "msw"
import { setupServer } from "msw/node"
import { IMAGE_CDN } from "../gatsby-worker"
import getSharpInstance from "gatsby-sharp"

const server = setupServer(
  rest.get(`https://external.com/dog.jpg`, async (req, res, ctx) => {
    const content = await fs.readFile(
      path.join(__dirname, `../../__tests__/__fixtures__/dog-portrait.jpg`)
    )

    return res(
      ctx.set(`Content-Type`, `image/jpg`),
      ctx.set(`Content-Length`, content.length.toString()),
      ctx.status(200),
      ctx.body(content)
    )
  })
)

describe(`gatsby-worker`, () => {
  beforeAll(() => server.listen())
  afterAll(() => server.close())

  describe(`IMAGE_CDN`, () => {
    it(`should download and transform an image`, async () => {
      const outputDir = path.join(__dirname, `.cache`)
      await IMAGE_CDN({
        outputDir,
        args: {
          contentDigest: `1`,
          filename: `abc.jpg`,
          format: `jpg`,
          height: 100,
          width: 100,
          quality: 80,
          url: `https://external.com/dog.jpg`,
        },
      })

      const outputFile = path.join(outputDir, `abc.jpg`)
      expect(await fs.pathExists(outputFile)).toBe(true)

      const sharp = await getSharpInstance()
      const metadata = await sharp(outputFile).metadata()
      expect(metadata.width).toBe(100)
      expect(metadata.height).toBe(100)

      await fs.remove(outputFile)
    })
  })
})
